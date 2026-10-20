import { db } from './db.js';
import {
  Appointment,
  AppointmentStatus,
  BranchId,
  DoctorSession,
  SlotAvailability,
  Parent,
  PaymentMethod,
} from '../src/types/index.js';

// Helper: convert HH:mm string to minutes from midnight
export function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

// Helper: convert minutes from midnight to HH:mm
export function minutesToTime(minutes: number): string {
  const normalized = Math.max(0, minutes % (24 * 60));
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export class SchedulingService {
  public ensureDoctorSession(doctorId: string, branchId: BranchId, date: string): DoctorSession {
    const state = db.getState();
    let session = state.sessions.find(
      (s) => s.doctorId === doctorId && s.branchId === branchId && s.date === date
    );
    if (!session) {
      const doctorObj = state.doctors.find((d) => d.id === doctorId);
      const doctorSchedule = state.schedules.find(
        (s) => s.doctorId === doctorId && s.branchId === branchId && s.isAvailable
      );
      const customDuration = doctorSchedule?.slotDurationMinutes || doctorObj?.slotDurationMinutes || 15;
      session = {
        doctorId,
        branchId,
        date,
        scheduledStart: doctorSchedule?.startTime || '10:00',
        actualStart: undefined,
        status: 'IN_SESSION',
        currentDelayMinutes: 0,
        avgConsultationDurationMinutes: customDuration,
        bufferAvailableMinutes: 20,
        emergencyAdjustmentCount: 0,
      };
      state.sessions.push(session);
    }
    return session;
  }

  public ensureDoctorSessionsForDate(date: string): void {
    const state = db.getState();
    const [y, m, d] = date.split('-').map(Number);
    const dayOfWeek = new Date(y, m - 1, d).getDay();
    state.schedules.forEach((sch) => {
      if (sch.isAvailable && sch.daysOfWeek.includes(dayOfWeek)) {
        this.ensureDoctorSession(sch.doctorId, sch.branchId, date);
      }
    });
  }

  /**
   * Recalculates expected consultation times and queue metrics for a doctor session.
   * Employs rolling train-ETA model: near-term appointments absorb delay;
   * downstream appointments (beyond ~1.5 hours) gradually catch up via buffer absorption.
   */
  public recalculateSessionQueue(doctorId: string, branchId: BranchId, date: string): void {
    const state = db.getState();
    let session = state.sessions.find(
      (s) => s.doctorId === doctorId && s.branchId === branchId && s.date === date
    );

    if (!session) {
      session = this.ensureDoctorSession(doctorId, branchId, date);
    }

    // Clear queue positioning and ETA flags on all terminal appointments
    state.appointments
      .filter((a) => a.doctorId === doctorId && a.branchId === branchId && a.date === date)
      .forEach((a) => {
        if (
          a.status === 'COMPLETED' ||
          a.status === 'NO_SHOW' ||
          a.status === 'SLOT_RELEASED' ||
          a.status === 'RESCHEDULED' ||
          a.status === 'HOSPITAL_CANCELLED' ||
          (a.status as string) === 'CANCELLED'
        ) {
          a.childrenAhead = undefined;
          a.positionInQueue = undefined;
          a.isNextInQueue = false;
        }
      });

    // Fetch all active appointments for this doctor, branch, and date ordered by effective time (reassignedTime or bookedTime)
    const dayAppointments = state.appointments
      .filter(
        (a) =>
          a.doctorId === doctorId &&
          a.branchId === branchId &&
          a.date === date &&
          a.status !== 'RESCHEDULED' &&
          a.status !== 'HOSPITAL_CANCELLED' &&
          (a.status as string) !== 'CANCELLED'
      )
      .sort((a, b) => {
        const timeA = timeToMinutes(a.reassignedTime || a.bookedTime);
        const timeB = timeToMinutes(b.reassignedTime || b.bookedTime);
        return timeA - timeB;
      });

    if (dayAppointments.length === 0) return;

    const isToday = date === state.config.simulatedDate;
    const isFuture = date > state.config.simulatedDate;
    const scheduledStartMin = timeToMinutes(session.scheduledStart || '10:00');
    const simulatedNowMin = isToday ? timeToMinutes(state.config.simulatedTime) : scheduledStartMin;
    const doctorObj = state.doctors.find((d) => d.id === doctorId);
    const doctorSchedule = state.schedules.find(
      (s) => s.doctorId === doctorId && s.branchId === branchId
    );
    const expectedDuration =
      doctorSchedule?.slotDurationMinutes ||
      doctorObj?.slotDurationMinutes ||
      session.avgConsultationDurationMinutes ||
      state.config.slotDurationMinutes ||
      15;

    // Active appointment with doctor
    const currentActiveAppt = dayAppointments.find((a) => a.status === 'WITH_DOCTOR');
    let doctorAvailableMin = scheduledStartMin;

    if (currentActiveAppt && currentActiveAppt.consultationStartTime) {
      const startMin = timeToMinutes(currentActiveAppt.consultationStartTime);
      const elapsed = Math.max(0, simulatedNowMin - startMin);
      if (elapsed > expectedDuration) {
        // Active consultation has overrun its expected duration (no arbitrary +5 inflation)
        const overrun = elapsed - expectedDuration;
        session.currentDelayMinutes = Math.max(session.currentDelayMinutes, overrun);
        doctorAvailableMin = simulatedNowMin;
      } else {
        doctorAvailableMin = Math.max(simulatedNowMin, startMin + expectedDuration);
      }
    } else {
      // Doctor has no active consultation
      if (isFuture) {
        // Future date queue: doctor starts at scheduled start plus any session delay
        doctorAvailableMin = scheduledStartMin + (session.currentDelayMinutes || 0);
      } else if (!session.actualStart) {
        // Doctor has not started consultations today yet
        const delay = session.currentDelayMinutes || 0;
        doctorAvailableMin = Math.max(simulatedNowMin, scheduledStartMin + delay);
      } else {
        // Doctor has already started today and is currently free between consultations
        const manualDelay = session.manualDelayMinutes || 0;
        if (manualDelay > 0) {
          // Explicit manual delay set by receptionist must be retained and applied to downstream slots
          session.currentDelayMinutes = manualDelay;
          doctorAvailableMin = simulatedNowMin + manualDelay;
        } else {
          doctorAvailableMin = simulatedNowMin;
          const nextDueAppt = dayAppointments.find(
            (a) =>
              a.status === 'WAITING' ||
              a.status === 'ARRIVED' ||
              a.status === 'BOOKED' ||
              a.status === 'APPROACHING'
          );
          if (!nextDueAppt) {
            session.currentDelayMinutes = 0;
          } else if (doctorAvailableMin <= timeToMinutes(nextDueAppt.bookedTime)) {
            session.currentDelayMinutes = 0;
          }
        }
      }
    }
    session.estimatedAvailabilityTime = minutesToTime(doctorAvailableMin);

    // Count waiting/ahead & project queue sequentially
    let waitingAheadCounter = 0;
    const isDoctorBusy = !!currentActiveAppt;
    let nextSlotStartMin = doctorAvailableMin;

    dayAppointments.forEach((appt) => {
      // Inactive appointments do NOT consume slot capacity
      if (
        appt.status === 'COMPLETED' ||
        appt.status === 'NO_SHOW' ||
        appt.status === 'SLOT_RELEASED' ||
        appt.status === 'RESCHEDULED' ||
        appt.status === 'HOSPITAL_CANCELLED' ||
        (appt.status as string) === 'CANCELLED'
      ) {
        appt.childrenAhead = undefined;
        appt.positionInQueue = undefined;
        appt.isNextInQueue = false;
        return; // Early return without advancing nextSlotStartMin
      }

      if (appt.status === 'WITH_DOCTOR') {
        appt.childrenAhead = 0;
        appt.positionInQueue = 0;
        appt.isNextInQueue = false;
        return;
      }

      const targetTimeStr = appt.reassignedTime || appt.bookedTime;
      const targetMin = timeToMinutes(targetTimeStr);
      const bookedMin = timeToMinutes(appt.bookedTime);

      // Earliest possible start:
      // 1) On today's queue: cannot start in the past (>= simulatedNowMin)
      // 2) On future queues: not bounded by today's simulated clock
      // 3) Cannot start before target time (reassigned time or scheduled slot)
      // 4) Cannot start before doctor availability / previous patient completion
      let expectedStartMin: number;
      if (appt.reassignedTime) {
        // DM-R7-012: Explicitly reassigned time must be strictly respected.
        // Patient cannot be scheduled earlier than the accepted reassigned time.
        if (isToday) {
          expectedStartMin = Math.max(simulatedNowMin, targetMin, nextSlotStartMin > targetMin ? nextSlotStartMin : targetMin);
        } else {
          expectedStartMin = Math.max(targetMin, nextSlotStartMin > targetMin ? nextSlotStartMin : targetMin);
        }
      } else {
        if (isToday) {
          expectedStartMin = Math.max(simulatedNowMin, bookedMin, nextSlotStartMin);
        } else {
          expectedStartMin = Math.max(bookedMin, nextSlotStartMin);
        }
      }

      // Chain doctor availability for subsequent patients
      nextSlotStartMin = expectedStartMin + expectedDuration;

      appt.expectedConsultationTime = minutesToTime(expectedStartMin);

      // Recommended arrival is 15 minutes before expected consultation
      const recommendedArrivalMin = Math.max(0, expectedStartMin - state.config.arrivalBeforeAppointmentMinutes);
      appt.recommendedArrivalTime = minutesToTime(recommendedArrivalMin);

      // Queue position
      if (
        appt.status === 'WAITING' ||
        appt.status === 'ARRIVED' ||
        appt.status === 'BOOKED' ||
        appt.status === 'APPROACHING'
      ) {
        appt.positionInQueue = waitingAheadCounter + 1;
        appt.childrenAhead = (isDoctorBusy ? 1 : 0) + waitingAheadCounter;
        appt.isNextInQueue = appt.positionInQueue === 1;
        waitingAheadCounter++;
      } else {
        appt.childrenAhead = undefined;
        appt.isNextInQueue = false;
      }

      // Delay status explanation (Section 10 of PDF: avoid misleading automated "critical patient stabilization")
      const effectiveDelay = Math.max(0, expectedStartMin - bookedMin);
      if (appt.reassignedTime) {
        appt.delayExplanation = `Consultation time reassigned to ${appt.expectedConsultationTime} by reception desk.`;
      } else if (session.delayReason) {
        appt.delayExplanation = `Doctor running approximately ${effectiveDelay} minutes late: ${session.delayReason}`;
      } else if (effectiveDelay > 5) {
        appt.delayExplanation = `Doctor running approximately ${effectiveDelay} minutes behind schedule.`;
      } else if (expectedStartMin < bookedMin) {
        appt.delayExplanation = `Doctor is running slightly ahead of schedule. Early consultation may be possible if you arrive.`;
      } else {
        appt.delayExplanation = `Doctor running approximately on schedule.`;
      }

      // Check notification triggers: if 2 children ahead and within notification preference
      if (appt.childrenAhead !== undefined && appt.childrenAhead <= state.config.notificationTriggerChildrenCount) {
        if (appt.status === 'BOOKED') {
          appt.status = 'APPROACHING';
          this.sendSimulatedNotification(
            appt,
            'Consultation Approaching',
            `Your consultation with ${appt.doctorName} is approaching. There are currently ${appt.childrenAhead} patients ahead of you. Please proceed to ${appt.hospitalName || 'the hospital'}.`
          );
        }
      }
    });

    db.persistState();
  }

  /**
   * Generates available slots for a doctor on a given date at a branch.
   */
  public getAvailableSlots(
    doctorId: string,
    branchId: BranchId,
    dateStr: string,
    excludeAppointmentId?: string
  ): SlotAvailability[] {
    const state = db.getState();
    const parts = dateStr.split('-').map(Number);
    const dayOfWeek = parts.length === 3 ? new Date(parts[0], parts[1] - 1, parts[2]).getDay() : new Date(dateStr).getDay();

    const doctorObj = state.doctors.find((d) => d.id === doctorId);
    if (!doctorObj) return [];

    const isDayIncluded = (days: number[] | undefined, dow: number): boolean => {
      if (!Array.isArray(days) || days.length === 0) return true;
      if (dow === 0) return days.includes(0) || days.includes(7);
      return days.includes(dow);
    };

    // Check doctor profile working days (0=Sunday/7=Sunday, 1=Monday, ..., 6=Saturday)
    if (Array.isArray(doctorObj.availableDays) && !isDayIncluded(doctorObj.availableDays, dayOfWeek)) {
      return [];
    }

    // Find schedule specifically for this doctor, branch, and dayOfWeek
    let schedule = state.schedules.find(
      (s) => s.doctorId === doctorId && (s.branchId === branchId || !branchId) && isDayIncluded(s.daysOfWeek, dayOfWeek) && s.isAvailable
    ) || state.schedules.find(
      (s) => s.doctorId === doctorId && isDayIncluded(s.daysOfWeek, dayOfWeek) && s.isAvailable
    );

    if (!schedule) {
      // If doctor has defined schedules, none matched dayOfWeek or isAvailable was false
      const doctorSchedules = state.schedules.filter((s) => s.doctorId === doctorId);
      if (doctorSchedules.length > 0) {
        return [];
      }

      // Fallback only if no schedules exist at all for this doctor in database
      const allowedDays = doctorObj.availableDays || [1, 2, 3, 4, 5, 6];
      if (!isDayIncluded(allowedDays, dayOfWeek)) {
        return [];
      }

      schedule = {
        id: `sch_${doctorId}`,
        hospitalId: doctorObj.hospitalId,
        doctorId: doctorId,
        branchId: branchId || doctorObj.branches[0] || 'main',
        daysOfWeek: allowedDays,
        startTime: '09:00',
        endTime: '17:00',
        slotDurationMinutes: doctorObj.slotDurationMinutes || 15,
        bufferMinutesPerHour: 10,
        isAvailable: true,
      };
    }

    if (!schedule.isAvailable || !isDayIncluded(schedule.daysOfWeek, dayOfWeek)) {
      return [];
    }

    // Authoritative slot duration from doctor profile
    const slotDuration = doctorObj?.slotDurationMinutes || schedule.slotDurationMinutes || 15;
    schedule.slotDurationMinutes = slotDuration;

    const startMinutes = timeToMinutes(schedule.startTime || '09:00');
    const endMinutes = timeToMinutes(schedule.endTime || '17:00');
    const bufferMinutes = schedule.bufferMinutesPerHour !== undefined ? schedule.bufferMinutesPerHour : 10;

    // Existing active bookings for this date and doctor (excluding terminal/released statuses)
    const existingBookings = state.appointments.filter(
      (a) =>
        a.doctorId === doctorId &&
        a.date === dateStr &&
        a.id !== excludeAppointmentId &&
        a.appointmentNumber !== excludeAppointmentId &&
        a.status !== 'RESCHEDULED' &&
        a.status !== 'SLOT_RELEASED' &&
        a.status !== 'HOSPITAL_CANCELLED' &&
        a.status !== 'NO_SHOW' &&
        (a.status as string) !== 'CANCELLED'
    );

    const slots: SlotAvailability[] = [];
    let current = startMinutes;
    let slotIndex = 0;
    const slotsPerHour = Math.max(1, Math.floor(60 / slotDuration));

    while (current + slotDuration <= endMinutes) {
      const timeStr = minutesToTime(current);
      const slotEndMin = current + slotDuration;

      // Check if this candidate slot overlaps with ANY existing active appointment
      const overlappingAppt = existingBookings.find((a) => {
        const apptStart = timeToMinutes(a.bookedTime);
        const apptEnd = apptStart + slotDuration;
        return Math.max(current, apptStart) < Math.min(slotEndMin, apptEnd);
      });

      // Buffer slot allocation: only if bufferMinutes > 0 and no appointment booked
      const isBuffer = bufferMinutes > 0 && !overlappingAppt && (slotIndex % slotsPerHour === slotsPerHour - 1);

      if (overlappingAppt) {
        slots.push({
          time: timeStr,
          available: false,
          status: 'Booked',
        });
      } else if (isBuffer) {
        slots.push({
          time: timeStr,
          available: false,
          status: 'Buffer',
          isBufferSlot: true,
        });
      } else {
        slots.push({
          time: timeStr,
          available: true,
          status: 'Available',
        });
      }

      current += slotDuration;
      slotIndex++;
    }

    return slots;
  }

  /**
   * Validates whether a requested slot is within offered doctor hours and currently available
   */
  public validateSlotForBookingOrReschedule(params: {
    doctorId: string;
    branchId: BranchId;
    date: string;
    bookedTime: string;
    excludeAppointmentId?: string;
  }): { valid: boolean; status: number; message?: string } {
    const state = db.getState();
    const doctor = state.doctors.find((d) => d.id === params.doctorId);
    if (!doctor) {
      return { valid: false, status: 404, message: 'Doctor not found.' };
    }

    if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(params.bookedTime)) {
      return { valid: false, status: 400, message: `Invalid time slot format: ${params.bookedTime}. Expected HH:MM.` };
    }

    const availableSlots = this.getAvailableSlots(
      params.doctorId,
      params.branchId,
      params.date,
      params.excludeAppointmentId
    );

    if (availableSlots.length === 0) {
      return {
        valid: false,
        status: 400,
        message: `${doctor.name} has no available consultation schedule on ${params.date}.`,
      };
    }

    const slot = availableSlots.find((s) => s.time === params.bookedTime);
    if (!slot) {
      return {
        valid: false,
        status: 400,
        message: `Slot ${params.bookedTime} is outside ${doctor.name}'s offered consultation hours on ${params.date}.`,
      };
    }

    if (slot.isBufferSlot || slot.status === 'Buffer') {
      return {
        valid: false,
        status: 400,
        message: `Slot ${params.bookedTime} is reserved as an OPD buffer/break period and cannot be booked or rescheduled to.`,
      };
    }

    if (!slot.available || slot.status === 'Booked') {
      return {
        valid: false,
        status: 409,
        message: `Slot ${params.bookedTime} is already occupied by another patient on ${params.date}.`,
      };
    }

    return { valid: true, status: 200 };
  }

  /**
   * Prevents appointment hoarding: A child must not have multiple active appointments with the same doctor on the same day.
   */
  public checkOneActiveAppointmentRule(childId: string, doctorId: string, date: string): boolean {
    const state = db.getState();
    const activeAppointment = state.appointments.find(
      (a) =>
        a.childId === childId &&
        a.doctorId === doctorId &&
        a.date === date &&
        ['BOOKED', 'APPROACHING', 'ARRIVED', 'WAITING', 'WITH_DOCTOR'].includes(a.status)
    );
    return !activeAppointment;
  }

  /**
   * Atomically books an appointment.
   */
  public bookAppointment(params: {
    parentId: string;
    childId: string;
    doctorId: string;
    branchId: BranchId;
    date: string;
    bookedTime: string;
    bookingSource?: 'ONLINE' | 'RECEPTION_PHONE' | 'WALK_IN';
    advanceNoticePreferenceMinutes?: number;
  }): { success: boolean; appointment?: Appointment; message?: string } {
    const state = db.getState();

    // 0. Check if parent is blocked due to consecutive no-shows
    const parent = state.parents.find((p) => p.id === params.parentId);
    if (parent && parent.isBlocked) {
      return {
        success: false,
        message: "As you didn't respect your appointment slot, we are temporarily blocking your appointment booking. Please contact hospital reception to re-enable booking.",
      };
    }

    // 1. One Active Appointment Rule
    if (!this.checkOneActiveAppointmentRule(params.childId, params.doctorId, params.date)) {
      return {
        success: false,
        message: 'You already have an active appointment for this child on this date with this doctor.',
      };
    }

    // 2. Concurrency check: is slot already taken?
    const conflict = state.appointments.find(
      (a) =>
        a.doctorId === params.doctorId &&
        a.branchId === params.branchId &&
        a.date === params.date &&
        a.bookedTime === params.bookedTime &&
        a.status !== 'RESCHEDULED' &&
        a.status !== 'SLOT_RELEASED' &&
        a.status !== 'HOSPITAL_CANCELLED' &&
        a.status !== 'NO_SHOW' &&
        (a.status as string) !== 'CANCELLED'
    );

    if (conflict) {
      return {
        success: false,
        message: 'Sorry, this appointment was just booked by another parent. Please select another available time.',
      };
    }

    // Verify parent & child
    if (!parent) return { success: false, message: 'Parent account not found.' };

    const child = parent.children.find((c) => c.id === params.childId);
    if (!child) return { success: false, message: 'Child profile not found.' };

    const doctor = state.doctors.find((d) => d.id === params.doctorId);
    if (!doctor) return { success: false, message: 'Doctor not found.' };

    // Verify doctor is scheduled to consult on this day of week
    const datePartsParsed = params.date.split('-').map(Number);
    const bookingDayOfWeek = datePartsParsed.length === 3
      ? new Date(datePartsParsed[0], datePartsParsed[1] - 1, datePartsParsed[2]).getDay()
      : new Date(params.date).getDay();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const isDayIncluded = (days: number[] | undefined, dow: number): boolean => {
      if (!Array.isArray(days) || days.length === 0) return true;
      if (dow === 0) return days.includes(0) || days.includes(7);
      return days.includes(dow);
    };

    if (Array.isArray(doctor.availableDays) && !isDayIncluded(doctor.availableDays, bookingDayOfWeek)) {
      return {
        success: false,
        message: `${doctor.name} is not scheduled for consultations on ${dayNames[bookingDayOfWeek]}s.`,
      };
    }

    const availableSlots = this.getAvailableSlots(params.doctorId, params.branchId, params.date);
    if (availableSlots.length === 0) {
      return {
        success: false,
        message: `${doctor.name} has no consultation schedule on ${params.date} (${dayNames[bookingDayOfWeek]}).`,
      };
    }

    const requestedSlot = availableSlots.find((s) => s.time === params.bookedTime);
    if (!requestedSlot || !requestedSlot.available) {
      return {
        success: false,
        message: requestedSlot?.isBufferSlot
          ? 'This slot is reserved as a hospital buffer/break period and cannot be booked.'
          : 'Selected appointment slot is not available.',
      };
    }

    const branch = state.branches.find((b) => b.id === params.branchId);
    if (!branch) return { success: false, message: 'Branch not found.' };

    const branchInitial = params.branchId === 'kakinada' ? 'K' : 'P';

    const dateParts = params.date.split('-');
    const yyyy = dateParts[0] || '2026';
    const mm = dateParts[1] || '01';
    const dd = dateParts[2] || '01';
    const yy = yyyy.slice(-2);
    const ddmmyy = `${dd}${mm}${yy}`;
    const timeCode = (params.bookedTime || '00:00').replace(':', '');

    let appointmentNumber = `SD-${branchInitial}-${ddmmyy}-${timeCode}`;
    const duplicateCount = state.appointments.filter((a) =>
      a.appointmentNumber.startsWith(appointmentNumber)
    ).length;
    if (duplicateCount > 0) {
      appointmentNumber = `${appointmentNumber}-${String(duplicateCount + 1).padStart(2, '0')}`;
    }

    const bookedMin = timeToMinutes(params.bookedTime);
    const recommendedArrival = minutesToTime(Math.max(0, bookedMin - state.config.arrivalBeforeAppointmentMinutes));

    const newAppointment: Appointment = {
      id: `apt-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      appointmentNumber,
      childId: child.id,
      childName: child.name,
      parentId: parent.id,
      parentName: parent.name,
      parentMobile: parent.mobile,
      doctorId: doctor.id,
      doctorName: doctor.name,
      branchId: branch.id,
      branchName: branch.name,
      date: params.date,
      bookedTime: params.bookedTime,
      expectedConsultationTime: params.bookedTime,
      recommendedArrivalTime: recommendedArrival,
      status: 'BOOKED',
      paymentStatus: 'PENDING',
      bookingSource: params.bookingSource || 'ONLINE',
      advanceNoticePreferenceMinutes: params.advanceNoticePreferenceMinutes || 30,
      history: [
        {
          timestamp: `${state.config.simulatedDate} ${state.config.simulatedTime}`,
          status: 'BOOKED',
          note: params.bookingSource === 'RECEPTION_PHONE' ? 'Booked over phone by receptionist' : 'Booked online by parent',
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    state.appointments.push(newAppointment);

    // Recalculate queue ETAs
    this.recalculateSessionQueue(params.doctorId, params.branchId, params.date);

    // Persist to SQLite
    db.persistState();

    return { success: true, appointment: newAppointment };
  }

  /**
   * Reschedule appointment: allowed only until 60 minutes before appointment time.
   */
  public rescheduleAppointment(
    appointmentId: string,
    newBookedTime: string,
    newDate?: string
  ): { success: boolean; appointment?: Appointment; message?: string } {
    const state = db.getState();
    const appt = state.appointments.find((a) => a.id === appointmentId);

    if (!appt) return { success: false, message: 'Appointment not found.' };

    // Check cutoff (60 mins before booked appointment time)
    const targetDate = newDate || appt.date;
    const nowMin = timeToMinutes(state.config.simulatedTime);
    const bookedMin = timeToMinutes(appt.bookedTime);

    if (appt.date === state.config.simulatedDate && bookedMin - nowMin < state.config.rescheduleCutoffMinutes) {
      return {
        success: false,
        message: 'Your appointment is approaching and can no longer be rescheduled online. Please proceed to the hospital as planned.',
      };
    }

    // Check slot availability and offered schedule range (DM-R7-009)
    const slotValidation = this.validateSlotForBookingOrReschedule({
      doctorId: appt.doctorId,
      branchId: appt.branchId,
      date: targetDate,
      bookedTime: newBookedTime,
      excludeAppointmentId: appt.id,
    });

    if (!slotValidation.valid) {
      return {
        success: false,
        message: slotValidation.message,
      };
    }

    // Old slot is freed atomically
    const oldTime = appt.bookedTime;
    appt.bookedTime = newBookedTime;
    if (newDate) appt.date = newDate;
    appt.expectedConsultationTime = newBookedTime;
    appt.recommendedArrivalTime = minutesToTime(
      Math.max(0, timeToMinutes(newBookedTime) - state.config.arrivalBeforeAppointmentMinutes)
    );
    appt.history.push({
      timestamp: `${state.config.simulatedDate} ${state.config.simulatedTime}`,
      status: 'BOOKED',
      note: `Rescheduled from ${oldTime} to ${newBookedTime}`,
    });
    appt.updatedAt = new Date().toISOString();

    // Recalculate
    this.recalculateSessionQueue(appt.doctorId, appt.branchId, appt.date);
    db.persistState();

    return { success: true, appointment: appt };
  }

  /**
   * Reception Workflow: Check in / payment received
   */
  public checkInPaymentReceived(
    appointmentId: string,
    paymentMethod: PaymentMethod = 'CASH'
  ): { success: boolean; message?: string } {
    const state = db.getState();
    const appt = state.appointments.find((a) => a.id === appointmentId);
    if (!appt) return { success: false, message: 'Appointment not found' };

    // DM-R7-010: Cancelled or terminal appointments cannot re-enter active queue via payment
    const terminalStatuses = ['CANCELLED', 'HOSPITAL_CANCELLED', 'SLOT_RELEASED', 'NO_SHOW', 'COMPLETED', 'RESCHEDULED'];
    if (terminalStatuses.includes(appt.status)) {
      return {
        success: false,
        message: `Cannot check in or receive payment for appointment with status "${appt.status.replace('_', ' ')}". Cancelled or completed appointments cannot re-enter the queue.`,
      };
    }

    appt.paymentStatus = 'PAID';
    appt.paymentMethod = paymentMethod;
    appt.status = 'WAITING';
    appt.actualArrivalTime = state.config.simulatedTime;
    const methodLabel = paymentMethod === 'PHONEPE' ? 'PhonePe / UPI' : 'Cash';
    appt.history.push({
      timestamp: `${state.config.simulatedDate} ${state.config.simulatedTime}`,
      status: 'ARRIVED',
      note: `Checked in by reception; consultation fee received via ${methodLabel}`,
    });
    appt.updatedAt = new Date().toISOString();

    this.recalculateSessionQueue(appt.doctorId, appt.branchId, appt.date);
    db.persistState();
    return { success: true };
  }

  /**
   * Reception / Doctor: Send to doctor / start consultation
   */
  public sendToDoctor(appointmentId: string): { success: boolean; message?: string } {
    const state = db.getState();
    const appt = state.appointments.find((a) => a.id === appointmentId);
    if (!appt) return { success: false, message: 'Appointment not found' };

    // Terminal or cancelled appointments cannot enter consultation
    const terminalStatuses = ['COMPLETED', 'NO_SHOW', 'HOSPITAL_CANCELLED', 'SLOT_RELEASED', 'RESCHEDULED', 'CANCELLED'];
    if (terminalStatuses.includes(appt.status)) {
      return {
        success: false,
        message: `Cannot start consultation for appointment with status "${appt.status.replace('_', ' ')}".`,
      };
    }

    // DM-R7-007: Enforce strictly one active consultation per doctor/date
    const activeAppt = state.appointments.find(
      (a) => a.doctorId === appt.doctorId && a.date === appt.date && a.status === 'WITH_DOCTOR' && a.id !== appt.id
    );
    if (activeAppt) {
      return {
        success: false,
        message: `Doctor is currently consulting with patient ${activeAppt.childName} (Token #${activeAppt.appointmentNumber}). Please complete active consultation before admitting another patient.`,
      };
    }

    // Update doctor session
    const session = state.sessions.find(
      (s) => s.doctorId === appt.doctorId && s.branchId === appt.branchId && s.date === appt.date
    );
    if (session) {
      session.currentAppointmentId = appt.id;
      if (!session.actualStart) {
        session.actualStart = state.config.simulatedTime;
      }
    }

    // QT-D01: Only initialize consultationStartTime and history on initial start; do not overwrite during polling
    if (appt.status !== 'WITH_DOCTOR' || !appt.consultationStartTime) {
      appt.status = 'WITH_DOCTOR';
      appt.consultationStartTime = state.config.simulatedTime;
      appt.history.push({
        timestamp: `${state.config.simulatedDate} ${state.config.simulatedTime}`,
        status: 'WITH_DOCTOR',
        note: 'Consultation initiated with pediatrician',
      });
      appt.updatedAt = new Date().toISOString();
    }

    this.recalculateSessionQueue(appt.doctorId, appt.branchId, appt.date);
    db.persistState();
    return { success: true };
  }

  /**
   * Reception / Doctor: Complete consultation
   */
  public completeConsultation(appointmentId: string): { success: boolean; message?: string } {
    const state = db.getState();
    const appt = state.appointments.find((a) => a.id === appointmentId);
    if (!appt) return { success: false, message: 'Appointment not found' };

    appt.status = 'COMPLETED';
    appt.consultationEndTime = state.config.simulatedTime;
    const expectedSlotDuration = state.config.slotDurationMinutes || 15;
    if (appt.consultationStartTime) {
      appt.consultationDurationMinutes = Math.max(
        5,
        timeToMinutes(appt.consultationEndTime) - timeToMinutes(appt.consultationStartTime)
      );
    } else {
      appt.consultationDurationMinutes = 14;
    }

    appt.history.push({
      timestamp: `${state.config.simulatedDate} ${state.config.simulatedTime}`,
      status: 'COMPLETED',
      note: 'Consultation completed successfully',
    });
    appt.updatedAt = new Date().toISOString();

    // Reset parent's consecutive no-shows since they attended
    const parent = state.parents.find((p) => p.id === appt.parentId || p.mobile === appt.parentMobile);
    if (parent) {
      parent.consecutiveNoShows = 0;
    }

    const session = state.sessions.find(
      (s) => s.doctorId === appt.doctorId && s.branchId === appt.branchId && s.date === appt.date
    );
    if (session) {
      if (session.currentAppointmentId === appt.id) {
        session.currentAppointmentId = undefined;
      }
      // QT-D02: Recover delay when consultation completes early compared to expected slot allocation
      if (appt.consultationDurationMinutes < expectedSlotDuration && session.currentDelayMinutes > 0) {
        const savedMinutes = expectedSlotDuration - appt.consultationDurationMinutes;
        session.currentDelayMinutes = Math.max(0, session.currentDelayMinutes - savedMinutes);
      }
    }

    this.recalculateSessionQueue(appt.doctorId, appt.branchId, appt.date);
    db.persistState();
    return { success: true };
  }

  /**
   * Late arrival handling: Patient loses original priority, placed in next suitable position
   */
  public markLate(appointmentId: string): { success: boolean; message?: string } {
    const state = db.getState();
    const appt = state.appointments.find((a) => a.id === appointmentId);
    if (!appt) return { success: false, message: 'Appointment not found' };

    appt.status = 'LATE';
    appt.history.push({
      timestamp: `${state.config.simulatedDate} ${state.config.simulatedTime}`,
      status: 'LATE',
      note: 'Marked late by reception; pending reassignment when family arrives',
    });
    appt.updatedAt = new Date().toISOString();

    this.recalculateSessionQueue(appt.doctorId, appt.branchId, appt.date);
    db.persistState();
    return { success: true };
  }

  /**
   * Reassign position for late arriving or emergency adjusted patient
   */
  public reassignPosition(appointmentId: string, newPositionOrTime?: string): { success: boolean; message?: string } {
    const state = db.getState();
    const appt = state.appointments.find((a) => a.id === appointmentId);
    if (!appt) return { success: false, message: 'Appointment not found' };

    // Prevent reassigning terminal appointments
    if (['COMPLETED', 'HOSPITAL_CANCELLED', 'RESCHEDULED'].includes(appt.status)) {
      return { success: false, message: `Cannot reassign appointment with status ${appt.status}` };
    }

    appt.status = 'WAITING';
    if (newPositionOrTime && /^\d{1,2}:\d{2}$/.test(newPositionOrTime.trim())) {
      const [h, m] = newPositionOrTime.trim().split(':');
      const formatted = `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
      appt.reassignedTime = formatted;
      appt.expectedConsultationTime = formatted;
      appt.recommendedArrivalTime = minutesToTime(
        Math.max(0, timeToMinutes(formatted) - state.config.arrivalBeforeAppointmentMinutes)
      );
    } else if (newPositionOrTime && newPositionOrTime !== 'Next available') {
      appt.expectedConsultationTime = newPositionOrTime;
    }

    appt.delayExplanation = appt.reassignedTime
      ? `Consultation time reassigned to ${appt.reassignedTime} by reception desk.`
      : 'Your original appointment time has passed. Reception has assigned the next available consultation position.';

    appt.history.push({
      timestamp: `${state.config.simulatedDate} ${state.config.simulatedTime}`,
      status: 'WAITING',
      note: appt.reassignedTime
        ? `Reassigned to ${appt.reassignedTime} by reception`
        : 'Reassigned to active queue by reception',
    });
    appt.updatedAt = new Date().toISOString();

    this.recalculateSessionQueue(appt.doctorId, appt.branchId, appt.date);
    db.persistState();
    return { success: true };
  }

  /**
   * No-Show Rule: Releases slot capacity, tracks consecutive no-shows,
   * restricts booking if 3 consecutive no-shows reached, and alerts parent.
   */
  public markNoShow(appointmentId: string): {
    success: boolean;
    message?: string;
    isBlocked?: boolean;
    consecutiveNoShows?: number;
    parentName?: string;
    parentMobile?: string;
  } {
    const state = db.getState();
    const appt = state.appointments.find((a) => a.id === appointmentId);
    if (!appt) return { success: false, message: 'Appointment not found' };

    appt.status = 'NO_SHOW';
    appt.history.push({
      timestamp: `${state.config.simulatedDate} ${state.config.simulatedTime}`,
      status: 'NO_SHOW',
      note: 'Patient did not arrive within grace threshold; slot released by reception',
    });
    appt.updatedAt = new Date().toISOString();

    const parent = state.parents.find((p) => p.id === appt.parentId || p.mobile === appt.parentMobile);
    let consecutiveCount = 1;
    let isBlocked = false;

    if (parent) {
      consecutiveCount = (parent.consecutiveNoShows || 0) + 1;
      parent.consecutiveNoShows = consecutiveCount;

      if (consecutiveCount >= 3) {
        parent.isBlocked = true;
        isBlocked = true;
        parent.blockedReason = "As you didn't respect your appointment slot, we are temporarily blocking your appointment booking.";
        parent.blockedAt = `${state.config.simulatedDate} ${state.config.simulatedTime}`;

        this.sendSimulatedNotification(
          appt,
          'Online Booking Suspended (3 Consecutive No-Shows)',
          "As you didn't respect your appointment slot, we are temporarily blocking your appointment booking. Please contact hospital reception to resolve this."
        );
      } else {
        this.sendSimulatedNotification(
          appt,
          `Appointment Missed: No-Show (${consecutiveCount}/3)`,
          `Your appointment slot has passed and was marked as No-Show (${consecutiveCount}/3). Please note that 3 consecutive unattended appointments without cancellation will temporarily restrict your booking privileges.`
        );
      }
    } else {
      this.sendSimulatedNotification(
        appt,
        'Appointment Status Update',
        'Your appointment slot has passed. If you are still planning to visit today, please come to the hospital. Reception will arrange the next available consultation slot based on availability.'
      );
    }

    this.recalculateSessionQueue(appt.doctorId, appt.branchId, appt.date);
    db.persistState();

    return {
      success: true,
      isBlocked,
      consecutiveNoShows: consecutiveCount,
      parentName: parent?.name || appt.parentName,
      parentMobile: parent?.mobile || appt.parentMobile,
    };
  }

  /**
   * Reception: Re-enable booking privileges when parent calls and provides justification
   */
  public unblockPatient(params: {
    parentId?: string;
    mobile?: string;
    justification: string;
    receptionistName?: string;
  }): { success: boolean; message?: string; parent?: Parent } {
    const state = db.getState();
    const cleanMobile = params.mobile ? params.mobile.trim().replace(/\D/g, '') : '';
    const parent = state.parents.find(
      (p) =>
        (params.parentId && p.id === params.parentId) ||
        (cleanMobile && p.mobile.replace(/\D/g, '') === cleanMobile)
    );

    if (!parent) {
      return { success: false, message: 'Patient / Parent record not found' };
    }

    if (!params.justification || !params.justification.trim()) {
      return { success: false, message: 'Justification is required before reinstating booking privileges' };
    }

    parent.isBlocked = false;
    parent.consecutiveNoShows = 0;
    parent.blockedReason = undefined;
    parent.blockedAt = undefined;

    if (!parent.unblockHistory) {
      parent.unblockHistory = [];
    }

    const unblockRecord = {
      timestamp: `${state.config.simulatedDate} ${state.config.simulatedTime}`,
      justification: params.justification.trim(),
      receptionistName: params.receptionistName || 'Hospital Reception',
    };
    parent.unblockHistory.push(unblockRecord);

    state.notifications.push({
      id: `notif-${Date.now()}`,
      appointmentId: '',
      parentId: parent.id,
      title: 'Booking Privileges Restored',
      message: `Your appointment booking privileges have been re-enabled by hospital reception. Reason recorded: "${params.justification.trim()}". You may now book appointments as normal.`,
      type: 'GENERAL',
      timestamp: `${state.config.simulatedDate} ${state.config.simulatedTime}`,
      read: false,
    });

    db.persistState();
    return { success: true, parent };
  }

  /**
   * Emergency Priority Adjustment:
   * Inserts emergency patient, consumes buffer capacity, recalculates downstream ETAs
   */
  public insertEmergencyAdjustment(params: {
    hospitalId?: string;
    doctorId: string;
    branchId?: BranchId;
    childName: string;
    parentName: string;
    parentMobile: string;
  }): { success: boolean; appointment?: Appointment } {
    const state = db.getState();
    const effectiveDoctorId =
      !params.doctorId || params.doctorId === 'all'
        ? (state.doctors.find((d) => !params.hospitalId || (d.hospitalId || 'hosp_sdch') === params.hospitalId)?.id || 'dr-subba-rao')
        : params.doctorId;

    const doctor = state.doctors.find((d) => d.id === effectiveDoctorId);
    const targetHospitalId = params.hospitalId || doctor?.hospitalId || 'hosp_sdch';
    const hospital = state.hospitals.find((h) => h.id === targetHospitalId);
    const targetBranchId =
      params.branchId ||
      doctor?.branches[0] ||
      state.branches.find((b) => (b.hospitalId || 'hosp_sdch') === targetHospitalId)?.id ||
      'main';
    const branch = state.branches.find((b) => b.id === targetBranchId);

    let session = state.sessions.find(
      (s) => s.doctorId === effectiveDoctorId && s.date === state.config.simulatedDate
    );

    if (!session) {
      session = this.ensureDoctorSession(effectiveDoctorId, targetBranchId, state.config.simulatedDate);
      session.hospitalId = targetHospitalId;
    }

    if (session) {
      session.emergencyAdjustmentCount = (session.emergencyAdjustmentCount || 0) + 1;
      // Consume 15 mins of buffer (DM-R7-008: preserve valid 0, don't revert to default)
      const currentBuffer = typeof session.bufferAvailableMinutes === 'number' ? session.bufferAvailableMinutes : 20;
      session.bufferAvailableMinutes = Math.max(0, currentBuffer - 15);
      session.currentDelayMinutes = (session.currentDelayMinutes || 0) + 15; // Propagate 15m delay to downstream
    }

    const hospPrefix = hospital?.slug
      ? hospital.slug.substring(0, 4).toUpperCase()
      : (targetHospitalId === 'hosp_sdch' ? 'SDCH' : 'HOSP');
    const [yyyy, mm, dd] = state.config.simulatedDate.split('-');
    const yy = (yyyy || '2026').slice(-2);
    const ddmmyy = `${dd || '01'}${mm || '01'}${yy}`;
    const timeCode = (state.config.simulatedTime || '00:00').replace(':', '');

    const baseEmergencyToken = `DM-${hospPrefix}-${ddmmyy}-${timeCode}-EMG`;
    const existingMatches = state.appointments.filter(
      (a) => a.appointmentNumber === baseEmergencyToken || a.appointmentNumber.startsWith(`${baseEmergencyToken}-`)
    );
    const appointmentNumber = existingMatches.length > 0
      ? `${baseEmergencyToken}-${existingMatches.length + 1}`
      : baseEmergencyToken;

    const emergencyAppt: Appointment = {
      id: `apt-emg-${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      appointmentNumber,
      childId: `c-emg-${Date.now()}`,
      childName: params.childName || 'Emergency Pediatric Patient',
      parentId: 'p-emg',
      parentName: params.parentName || 'Attending Guardian',
      parentMobile: params.parentMobile || '9999999999',
      doctorId: effectiveDoctorId,
      doctorName: doctor?.name || 'Pediatric Specialist',
      branchId: targetBranchId,
      branchName: branch?.name || hospital?.name || 'Hospital Clinic',
      hospitalId: targetHospitalId,
      hospitalName: hospital?.name || 'Doctormate Hospital',
      date: state.config.simulatedDate,
      bookedTime: state.config.simulatedTime,
      expectedConsultationTime: state.config.simulatedTime,
      recommendedArrivalTime: state.config.simulatedTime,
      status: 'WAITING',
      paymentStatus: 'PAID',
      bookingSource: 'WALK_IN',
      advanceNoticePreferenceMinutes: 0,
      isEmergency: true,
      emergencyReason: 'Emergency priority adjustment',
      actualArrivalTime: state.config.simulatedTime,
      history: [
        {
          timestamp: `${state.config.simulatedDate} ${state.config.simulatedTime}`,
          status: 'ARRIVED',
          note: 'Emergency patient admitted with immediate queue priority',
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    state.appointments.push(emergencyAppt);
    this.recalculateSessionQueue(effectiveDoctorId, targetBranchId, state.config.simulatedDate);
    db.persistState();

    return { success: true, appointment: emergencyAppt };
  }

  /**
   * Cancel an individual appointment from the reception desk
   */
  public cancelIndividualAppointment(appointmentId: string, reason?: string): { success: boolean; appointment?: Appointment } {
    const state = db.getState();
    const appt = state.appointments.find((a) => a.id === appointmentId || a.appointmentNumber === appointmentId);
    if (!appt) return { success: false };

    appt.status = 'HOSPITAL_CANCELLED';
    appt.childrenAhead = undefined;
    appt.positionInQueue = undefined;
    appt.isNextInQueue = false;
    appt.history.push({
      timestamp: `${state.config.simulatedDate} ${state.config.simulatedTime}`,
      status: 'HOSPITAL_CANCELLED',
      note: reason || 'Cancelled by hospital reception',
    });
    appt.updatedAt = new Date().toISOString();

    const doctor = state.doctors.find((d) => d.id === appt.doctorId);
    this.sendSimulatedNotification(
      appt,
      'Appointment Cancelled by Hospital',
      `Your consultation with ${doctor?.name || 'the doctor'} scheduled for ${appt.bookedTime} on ${appt.date} has been cancelled by the hospital. Reason: "${reason || 'Operational contingency'}". Please check available appointments or contact reception for rebooking.`
    );

    this.recalculateSessionQueue(appt.doctorId, appt.branchId, appt.date);
    db.persistState();

    return { success: true, appointment: appt };
  }

  /**
   * Hospital-Caused Session Cancellation
   */
  public cancelDoctorSession(
    doctorId: string,
    branchId?: BranchId,
    reason?: string,
    date?: string
  ): { success: boolean; affectedCount: number } {
    const state = db.getState();
    const targetDate = String(date || state.config.simulatedDate);
    const isAllDoctors = !doctorId || doctorId === 'all';

    const matchingSessions = state.sessions.filter(
      (s) =>
        (isAllDoctors || s.doctorId === doctorId) &&
        (!branchId || s.branchId === branchId) &&
        s.date === targetDate
    );

    matchingSessions.forEach((session) => {
      session.status = 'CANCELLED_BY_HOSPITAL';
      session.cancellationNotice = reason || 'Emergency operational contingency';
    });

    const affectedAppointments = state.appointments.filter(
      (a) =>
        (isAllDoctors || a.doctorId === doctorId) &&
        (!branchId || a.branchId === branchId || isAllDoctors) &&
        a.date === targetDate &&
        ['BOOKED', 'APPROACHING', 'ARRIVED', 'WAITING'].includes(a.status)
    );

    affectedAppointments.forEach((appt) => {
      appt.status = 'HOSPITAL_CANCELLED';
      appt.childrenAhead = undefined;
      appt.positionInQueue = undefined;
      appt.isNextInQueue = false;
      appt.history.push({
        timestamp: `${state.config.simulatedDate} ${state.config.simulatedTime}`,
        status: 'HOSPITAL_CANCELLED',
        note: reason || 'Cancelled by hospital management',
      });
      appt.updatedAt = new Date().toISOString();

      const doctor = state.doctors.find((d) => d.id === appt.doctorId);
      this.sendSimulatedNotification(
        appt,
        'Hospital Notice - Session Cancelled',
        `Unfortunately your consultation with ${doctor?.name || 'the doctor'} on ${targetDate} has been cancelled by the hospital. We apologise for the inconvenience. Please check available appointments or contact reception.`
      );
    });

    // Recalculate sessions affected
    if (!isAllDoctors && branchId) {
      this.recalculateSessionQueue(doctorId, branchId, targetDate);
    }

    db.persistState();
    return { success: true, affectedCount: affectedAppointments.length };
  }

  /**
   * Helper to append an in-app simulated notification
   */
  public sendSimulatedNotification(appt: Appointment, title: string, message: string): void {
    const state = db.getState();
    state.notifications.unshift({
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      appointmentId: appt.id,
      parentId: appt.parentId,
      title,
      message,
      type: 'APPROACHING',
      timestamp: `${state.config.simulatedDate} ${state.config.simulatedTime}`,
      read: false,
    });
  }
}

export const schedulingService = new SchedulingService();
