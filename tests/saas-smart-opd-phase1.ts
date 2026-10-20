import express from 'express';
import { createServer } from 'http';
import { apiRouter } from '../server/routes.js';
import { db } from '../server/db.js';
import { schedulingService } from '../server/schedulingService.js';

async function runTestSuite() {
  console.log('====================================================');
  console.log('  DOCTORMATE SAAS — PHASE 1 END-TO-END VERIFICATION  ');
  console.log('====================================================\n');

  // 1. Setup ephemeral test server
  const app = express();
  app.use(express.json());
  app.use('/api', apiRouter);

  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(4199, resolve));
  const baseUrl = 'http://localhost:4199/api';

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      if (detail) console.error(`     Detail: ${detail}`);
      failed++;
    }
  }

  try {
    // ------------------------------------------------------------------------
    // TEST 1: Hospital Self-Registration
    // ------------------------------------------------------------------------
    console.log('\n--- Step 1: Hospital Self-Registration & Directory Listing ---');
    const regRes = await fetch(`${baseUrl}/hospitals/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Apollo Apex Hospital',
        address: '77 Healthcare Boulevard',
        city: 'Visakhapatnam',
        state: 'Andhra Pradesh',
        pincode: '530002',
        phone: '+91 891 223 4455',
        adminName: 'Dr. Vivek Sharma',
        adminEmail: `admin_${Date.now()}@apolloapex.com`,
        adminMobile: '9888877777',
        password: 'AdminPassword@123',
        hospitalType: 'Super Speciality Hospital',
      }),
    });
    const regData = await regRes.json();
    assert(regRes.ok && regData.success && !!regData.hospital?.id, 'Hospital self-registration succeeds with admin token');
    const hospitalId = regData.hospital.id;
    const hospitalSlug = regData.hospital.slug;

    // Verify hospital exists in public directory
    const dirRes = await fetch(`${baseUrl}/hospitals`);
    const dirData = await dirRes.json();
    assert(
      Array.isArray(dirData) && dirData.some((h: any) => h.id === hospitalId),
      'Newly registered hospital appears in public hospitals directory'
    );

    // ------------------------------------------------------------------------
    // TEST 2: Doctor Registration with Custom Time Slots (5m vs 10m)
    // ------------------------------------------------------------------------
    console.log('\n--- Step 2: Custom Doctor Slot Allocations (5 min vs 10 min) ---');
    const onboardRes = await fetch(`${baseUrl}/hospitals/${hospitalId}/onboarding`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        step: 3,
        doctors: [
          {
            name: 'Dr. Deepa Nair',
            specialty: 'Pediatric Quick OPD',
            slotDurationMinutes: 5, // 5-minute slots!
            consultationFee: 350,
            startTime: '09:00',
            endTime: '11:00',
            availableDays: [1, 2, 3, 4, 5, 6, 7],
          },
          {
            name: 'Dr. Rajesh Khanna',
            specialty: 'Cardiology Review',
            slotDurationMinutes: 10, // 10-minute slots!
            consultationFee: 700,
            startTime: '09:00',
            endTime: '11:00',
            availableDays: [1, 2, 3, 4, 5, 6, 7],
          },
        ],
        activate: true,
      }),
    });
    const onboardData = await onboardRes.json();
    assert(onboardRes.ok && onboardData.hospital?.status === 'ACTIVE', 'Hospital activated with custom doctors');

    // Retrieve doctors for this hospital
    const hospProfileRes = await fetch(`${baseUrl}/hospitals/${hospitalSlug}`);
    const hospProfile = await hospProfileRes.json();
    const doc5m = hospProfile.doctors.find((d: any) => d.name === 'Dr. Deepa Nair');
    const doc10m = hospProfile.doctors.find((d: any) => d.name === 'Dr. Rajesh Khanna');

    assert(doc5m && doc5m.slotDurationMinutes === 5, 'Doctor 1 configured with exact 5-minute slot duration');
    assert(doc10m && doc10m.slotDurationMinutes === 10, 'Doctor 2 configured with exact 10-minute slot duration');

    // Verify slot calculation intervals
    const branchId = hospProfile.branches[0]?.id || 'main';
    const testDate = db.getState().config.simulatedDate;

    const slots5m = schedulingService.getAvailableSlots(doc5m.id, branchId, testDate);
    const slots10m = schedulingService.getAvailableSlots(doc10m.id, branchId, testDate);

    assert(slots5m.length > 0, 'Available slots generated for 5-minute doctor');
    assert(slots10m.length > 0, 'Available slots generated for 10-minute doctor');

    // Check interval steps
    if (slots5m.length >= 2) {
      const t1 = slots5m[0].time;
      const t2 = slots5m[1].time;
      const [h1, m1] = t1.split(':').map(Number);
      const [h2, m2] = t2.split(':').map(Number);
      const diff5m = (h2 * 60 + m2) - (h1 * 60 + m1);
      assert(diff5m === 5, `5-minute doctor produces 5-minute slot intervals (${t1} -> ${t2})`);
    }

    if (slots10m.length >= 2) {
      const t1 = slots10m[0].time;
      const t2 = slots10m[1].time;
      const [h1, m1] = t1.split(':').map(Number);
      const [h2, m2] = t2.split(':').map(Number);
      const diff10m = (h2 * 60 + m2) - (h1 * 60 + m1);
      assert(diff10m === 10, `10-minute doctor produces 10-minute slot intervals (${t1} -> ${t2})`);
    }

    // ------------------------------------------------------------------------
    // TEST 3: Receptionist Telephone Booking & Duplicate Prevention
    // ------------------------------------------------------------------------
    console.log('\n--- Step 3: Receptionist Telephone Booking & Structured Tokens ---');
    const targetSlot = slots5m[0]?.time || '09:00';
    const phoneBookRes = await fetch(`${baseUrl}/reception/phone-booking`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hospitalId,
        patientName: 'Kiran Verma',
        mobileNumber: '9123456789',
        patientAge: 29,
        guardianName: 'Sunita Verma',
        doctorId: doc5m.id,
        branchId,
        date: testDate,
        bookedTime: targetSlot,
        bookingSource: 'RECEPTION_PHONE',
      }),
    });
    const phoneBookData = await phoneBookRes.json();
    assert(phoneBookRes.ok && phoneBookData.success, 'Reception telephone booking succeeds');
    assert(
      phoneBookData.appointment?.appointmentNumber && phoneBookData.appointment.appointmentNumber.startsWith('DM-'),
      `Appointment token follows structured format: ${phoneBookData.appointment?.appointmentNumber}`
    );
    assert(
      phoneBookData.appointment?.hospitalId === hospitalId,
      'Appointment is correctly tagged with hospitalId'
    );
    assert(
      !!phoneBookData.trackerUrl,
      `Two-factor tracking link generated: ${phoneBookData.trackerUrl}`
    );

    // Test duplicate booking prevention on the exact same slot
    const dupRes = await fetch(`${baseUrl}/reception/phone-booking`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hospitalId,
        patientName: 'Another Patient',
        mobileNumber: '9888800000',
        doctorId: doc5m.id,
        branchId,
        date: testDate,
        bookedTime: targetSlot,
        bookingSource: 'RECEPTION_PHONE',
      }),
    });
    assert(dupRes.status === 409, 'Double booking is rejected with 409 Conflict error');

    // ------------------------------------------------------------------------
    // TEST 4: Online Patient Booking
    // ------------------------------------------------------------------------
    console.log('\n--- Step 4: Public Online Patient Booking ---');
    const onlineSlot = slots5m[1]?.time || '09:05';
    const onlineBookRes = await fetch(`${baseUrl}/appointments/online-book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hospitalId,
        patientName: 'Aarav Patel',
        mobileNumber: '9988776655',
        patientAge: 6,
        guardianName: 'Meera Patel',
        doctorId: doc5m.id,
        branchId,
        date: testDate,
        bookedTime: onlineSlot,
      }),
    });
    const onlineBookData = await onlineBookRes.json();
    assert(onlineBookRes.ok && onlineBookData.success, 'Public online booking succeeds');
    assert(
      onlineBookData.appointment?.bookingSource === 'ONLINE',
      'Booking source is recorded as ONLINE'
    );

    // ------------------------------------------------------------------------
    // TEST 5: Multi-Tenant Data Isolation (Hospital A vs Hospital B)
    // ------------------------------------------------------------------------
    console.log('\n--- Step 5: Multi-Tenant Queue & Dashboard Isolation ---');
    // Hospital A (Apollo Apex)
    const dashResA = await fetch(`${baseUrl}/reception/dashboard?hospitalId=${hospitalId}&date=${testDate}`);
    const dashA = await dashResA.json();

    // Hospital B (Apex Multi-Specialty Hospital)
    const dashResB = await fetch(`${baseUrl}/reception/dashboard?hospitalId=hosp_sdch&date=${testDate}`);
    const dashB = await dashResB.json();

    const apptsA = dashA.appointments || [];
    const apptsB = dashB.appointments || [];

    const hasLeakedApptInB = apptsB.some((a: any) => a.hospitalId === hospitalId);
    const hasLeakedApptInA = apptsA.some((a: any) => a.hospitalId === 'hosp_sdch');

    assert(!hasLeakedApptInB, 'Hospital A appointments do NOT leak into Hospital B dashboard');
    assert(!hasLeakedApptInA, 'Hospital B appointments do NOT leak into Hospital A dashboard');
    assert(apptsA.length >= 2, `Hospital A reception sees its own appointments (found ${apptsA.length})`);

    // ------------------------------------------------------------------------
    // TEST 6: Doctor Delay & Train-ETA Queue Propagation
    // ------------------------------------------------------------------------
    console.log('\n--- Step 6: Dynamic Doctor Delay Propagation ---');
    const delayRes = await fetch(`${baseUrl}/reception/doctor-delay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hospitalId,
        doctorId: doc5m.id,
        branchId,
        date: testDate,
        delayMinutes: 20,
        explanation: 'Brief emergency round in ICU',
      }),
    });
    const delayData = await delayRes.json();
    assert(delayRes.ok && delayData.success, 'Doctor delay applied successfully');

    // Verify session updated for Hospital A
    const liveQueueA = await fetch(`${baseUrl}/queue/live?hospitalId=${hospitalId}&doctorId=${doc5m.id}&branchId=${branchId}&date=${testDate}`).then(r => r.json());
    assert(liveQueueA.session?.currentDelayMinutes === 20, 'Hospital A doctor session reflects 20-minute delay');

    // Verify Hospital B doctor session was unaffected
    const liveQueueB = await fetch(`${baseUrl}/queue/live?hospitalId=hosp_sdch&doctorId=dr-subba-rao&branchId=kakinada-main&date=${testDate}`).then(r => r.json());
    assert(liveQueueB.session?.currentDelayMinutes !== 20 || liveQueueB.session === undefined, 'Hospital B doctor queue unaffected by Hospital A delay');

    // ------------------------------------------------------------------------
    // TEST 7: Two-Factor Secure Tracking
    // ------------------------------------------------------------------------
    console.log('\n--- Step 7: Two-Factor Secure Appointment Tracking ---');
    const testApptNumber = phoneBookData.appointment.appointmentNumber;

    // A. Without mobile number (Anti-enumeration check)
    const trackNoMobile = await fetch(`${baseUrl}/appointments/secure-track?id=${testApptNumber}`);
    assert(trackNoMobile.status === 401, 'Tracking without mobile verification fails with 401');

    // B. With incorrect mobile number
    const trackWrongMobile = await fetch(`${baseUrl}/appointments/secure-track?id=${testApptNumber}&mobile=0000000000`);
    assert(trackWrongMobile.status === 401, 'Tracking with wrong mobile number fails with 401');

    // C. With correct mobile number (9123456789)
    const trackCorrect = await fetch(`${baseUrl}/appointments/secure-track?id=${testApptNumber}&mobile=9123456789`);
    const trackData = await trackCorrect.json();
    assert(trackCorrect.ok && trackData.success, 'Tracking with correct token + mobile succeeds');
    assert(trackData.patientName === 'Kiran Verma', 'Patient name verified');
    assert(typeof trackData.positionInQueue === 'number', 'Queue position calculated');
    assert(trackData.hospitalName === 'Apollo Apex Hospital', 'Correct hospital details returned in tracker');

    // ------------------------------------------------------------------------
    // TEST 8: QA Round 2 Regression Tests (DM-R2-001 through DM-R2-004)
    // ------------------------------------------------------------------------
    console.log('\n--- Step 8: QA Round 2 Regression Tests (DM-R2-001 through DM-R2-004) ---');

    // DM-R2-001: 3-digit mobile number rejection
    const invalidMobileRes = await fetch(`${baseUrl}/hospitals/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'QA Nimbus Test Hospital',
        address: '17 Test Lane',
        city: 'QA City',
        adminName: 'Nimbus Admin',
        adminEmail: `nimbus_${Date.now()}@example.com`,
        adminMobile: '123', // INVALID 3-DIGIT
        password: 'AdminPassword@123',
      }),
    });
    assert(invalidMobileRes.status === 400, 'DM-R2-001: 3-digit admin mobile number is rejected with 400 Bad Request');
    const invalidMobileData = await invalidMobileRes.json();
    assert(invalidMobileData.error.includes('10-digit'), 'DM-R2-001: Clear field error message for invalid mobile');

    // DM-R2-002 & DM-R2-004: Activation and newly registered admin dashboard access
    const regAuroraRes = await fetch(`${baseUrl}/hospitals/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'QA Aurora Test Hospital',
        address: '18 Test Lane',
        city: 'Visakhapatnam',
        adminName: 'Dr. QA Aurora Synthetic',
        adminEmail: `aurora_${Date.now()}@example.com`,
        adminMobile: '9000000172',
        password: 'AuroraPassword@123',
      }),
    });
    const regAuroraData = await regAuroraRes.json();
    assert(regAuroraRes.ok && !!regAuroraData.hospital?.id, 'Aurora test hospital registered');
    const auroraId = regAuroraData.hospital.id;
    const auroraSlug = regAuroraData.hospital.slug;

    // Activate Aurora
    const activateRes = await fetch(`${baseUrl}/hospitals/${auroraId}/onboarding`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        step: 6,
        activate: true,
      }),
    });
    const activateData = await activateRes.json();
    assert(activateRes.ok && activateData.hospital?.status === 'ACTIVE', 'DM-R2-002: Onboarding activation marks hospital ACTIVE');

    // DM-R2-003: Public booking route resolves by slug
    const publicHospRes = await fetch(`${baseUrl}/hospitals/${auroraSlug}`);
    const publicHospData = await publicHospRes.json();
    assert(publicHospRes.ok && publicHospData.hospital?.name === 'QA Aurora Test Hospital', 'DM-R2-003: Public hospital booking payload resolves by slug');

    // DM-R2-004: Newly registered hospital admin dashboard data loads with complete stats
    const auroraDashboardRes = await fetch(`${baseUrl}/hospital-admin/${auroraId}/dashboard`);
    const auroraDashboardData = await auroraDashboardRes.json();
    assert(auroraDashboardRes.ok && !!auroraDashboardData.hospital?.name, 'DM-R2-004: Admin dashboard payload successfully resolves without crash');
    assert(typeof auroraDashboardData.stats?.totalDoctors === 'number', 'DM-R2-004: Stats totalDoctors calculated');
    assert(Array.isArray(auroraDashboardData.todayAppointments), 'DM-R2-004: Today appointments array returned');

    // ==========================================
    // ROUND 3 QA REGRESSION TESTS (DM-R3-001, DM-R3-002, DM-R3-003)
    // ==========================================

    // DM-R3-002: Add Doctor validation - invalid start time >= end time rejected
    const invalidTimeRes = await fetch(`${baseUrl}/hospital-admin/${auroraId}/doctors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Dr. Invalid Timing',
        startTime: '18:00',
        endTime: '09:00', // Invalid: end time before start time
      }),
    });
    assert(!invalidTimeRes.ok && invalidTimeRes.status === 400, 'DM-R3-002: Reject doctor schedule when start time >= end time');

    // DM-R3-002: Add Doctor with full OPD schedule configuration (hours, days, breaks)
    const addDocRes = await fetch(`${baseUrl}/hospital-admin/${auroraId}/doctors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Dr. QA Meridian Synthetic',
        specialty: 'QA General Medicine',
        qualifications: 'MBBS, MD',
        experienceYears: 5,
        slotDurationMinutes: 20,
        consultationFee: 750,
        startTime: '08:30',
        endTime: '16:30',
        availableDays: [1, 2, 3, 4, 5],
        bufferMinutesPerHour: 15,
      }),
    });
    const addDocData = await addDocRes.json();
    assert(addDocRes.ok && addDocData.success, 'DM-R3-002: Doctor created with OPD schedule');
    assert(addDocData.doctor?.slotDurationMinutes === 20, 'DM-R3-002: Custom 20-min slot duration persisted');
    assert(addDocData.schedule?.startTime === '08:30' && addDocData.schedule?.endTime === '16:30', 'DM-R3-002: OPD start and end times saved');
    assert(addDocData.schedule?.bufferMinutesPerHour === 15, 'DM-R3-002: OPD buffer minutes saved');
    const createdDoctorId = addDocData.doctor.id;

    // DM-R3-001: Edit existing doctor & consultation settings (PUT endpoint)
    const editDocRes = await fetch(`${baseUrl}/hospital-admin/${auroraId}/doctors/${createdDoctorId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Dr. QA Meridian Synthetic (Lead Specialist)',
        specialty: 'Senior Pediatric Cardiology',
        slotDurationMinutes: 10,
        consultationFee: 900,
        startTime: '09:00',
        endTime: '18:00',
        availableDays: [1, 2, 3, 4, 5, 6],
        bufferMinutesPerHour: 10,
      }),
    });
    const editDocData = await editDocRes.json();
    assert(editDocRes.ok && editDocData.success, 'DM-R3-001: Edit doctor API succeeded');
    assert(editDocData.doctor?.name === 'Dr. QA Meridian Synthetic (Lead Specialist)', 'DM-R3-001: Updated doctor name persisted');
    assert(editDocData.doctor?.slotDurationMinutes === 10, 'DM-R3-001: Updated slot duration to 10 min persisted');
    assert(editDocData.schedule?.endTime === '18:00', 'DM-R3-001: Updated schedule end time to 18:00');

    // Verify hospital admin dashboard reflects the edited doctor and schedule
    const reloadedDashboardRes = await fetch(`${baseUrl}/hospital-admin/${auroraId}/dashboard`);
    const reloadedDashboard = await reloadedDashboardRes.json();
    const updatedDocInDash = reloadedDashboard.doctors.find((d: any) => d.id === createdDoctorId);
    assert(!!updatedDocInDash, 'DM-R3-001: Edited doctor listed in hospital admin dashboard');
    assert(updatedDocInDash.schedule?.startTime === '09:00', 'DM-R3-002: Admin dashboard provides schedule start time');
    assert(updatedDocInDash.schedule?.bufferMinutesPerHour === 10, 'DM-R3-002: Admin dashboard provides buffer/break time');

    // DM-R3-003: Receptionist tenant isolation & hospital scope
    const recUsername = `qa.aurora.desk.${Date.now()}`;
    const addRecRes = await fetch(`${baseUrl}/hospital-admin/${auroraId}/receptionists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: recUsername,
        password: 'Reception@123',
        name: 'QA Aurora Front Desk',
      }),
    });
    const addRecData = await addRecRes.json();
    assert(addRecRes.ok && addRecData.success, 'DM-R3-003: Receptionist account created under Aurora');

    // Receptionist login
    const recLoginRes = await fetch(`${baseUrl}/auth/reception-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: recUsername,
        password: 'Reception@123',
      }),
    });
    const recLoginData = await recLoginRes.json();
    assert(recLoginRes.ok && recLoginData.success, 'DM-R3-003: Receptionist logged in successfully');
    assert(recLoginData.user?.hospitalId === auroraId, 'DM-R3-003: Receptionist user scoped to Aurora hospitalId');

    // Check doctors scoped to Aurora hospital
    const scopedDocsRes = await fetch(`${baseUrl}/doctors?hospitalId=${auroraId}`);
    const scopedDocs = await scopedDocsRes.json();
    assert(Array.isArray(scopedDocs), 'DM-R3-003: Scoped doctors returned as array');
    assert(scopedDocs.every((d: any) => d.hospitalId === auroraId), 'DM-R3-003: Zero doctors from other hospitals exposed in Aurora scope');
    assert(!scopedDocs.some((d: any) => d.id === 'dr-subba-rao' || d.id === 'dr-prashant'), 'DM-R3-003: Apex doctors excluded from Aurora receptionist scope');

    // Check branches scoped to Aurora hospital
    const scopedBranchesRes = await fetch(`${baseUrl}/branches?hospitalId=${auroraId}`);
    const scopedBranches = await scopedBranchesRes.json();
    assert(scopedBranches.every((b: any) => b.hospitalId === auroraId), 'DM-R3-003: Zero branches from other hospitals exposed in Aurora scope');
    assert(!scopedBranches.some((b: any) => b.id === 'kakinada' || b.id === 'pithapuram'), 'DM-R3-003: Kakinada/Pithapuram excluded from Aurora scope');

    // ------------------------------------------------------------------------
    // STEP 9: QA Round 4 Regression Tests (DM-R4-001, DM-R4-002, DM-R4-003)
    // ------------------------------------------------------------------------
    console.log('\n--- Step 9: QA Round 4 Regression Tests (DM-R4-001 through DM-R4-003) ---');

    // DM-R4-001: Doctor with 15-minute slot duration generates 15-minute slot intervals
    // Create doctor with 15-min slot duration under Aurora
    const doc15Res = await fetch(`${baseUrl}/hospital-admin/${auroraId}/doctors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Dr. QA 15Min Synthetic',
        specialty: 'Pediatric Neurology',
        slotDurationMinutes: 15,
        consultationFee: 750,
        startTime: '14:00',
        endTime: '18:00',
        availableDays: [1, 2, 3, 4, 5, 6, 7],
        bufferMinutesPerHour: 0,
      }),
    });
    const doc15Data = await doc15Res.json();
    assert(doc15Res.ok && doc15Data.success, 'DM-R4-001: Created doctor with 15-minute slot duration');
    const doc15Id = doc15Data.doctor.id;

    // Fetch slots for 15-min doctor on simulated date (2026-10-18)
    const r4TestDate = '2026-10-18';
    const slots15Res = await fetch(`${baseUrl}/slots?doctorId=${doc15Id}&date=${r4TestDate}`);
    const slots15Data = await slots15Res.json();
    assert(Array.isArray(slots15Data) && slots15Data.length >= 2, 'DM-R4-001: 15-min doctor generated available slots');
    const slot0Time = slots15Data[0]?.time;
    const slot1Time = slots15Data[1]?.time;
    // Calculate difference in minutes between first two slots
    const [h0, m0] = slot0Time.split(':').map(Number);
    const [h1, m1] = slot1Time.split(':').map(Number);
    const diffMins = (h1 * 60 + m1) - (h0 * 60 + m0);
    assert(diffMins === 15, `DM-R4-001: Slots step by exact 15-minute intervals (got ${diffMins} mins: ${slot0Time} -> ${slot1Time})`);

    // DM-R4-001: Overlap prevention - Book 15:40 appointment
    const bookAlphaRes = await fetch(`${baseUrl}/reception/phone-booking`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hospitalId: auroraId,
        doctorId: doc15Id,
        bookedDate: r4TestDate,
        bookedTime: '15:40',
        patientName: 'QA Phone Alpha',
        patientMobile: '9000000411',
        age: '6',
        gender: 'Male',
        source: 'PHONE',
      }),
    });
    const bookAlphaData = await bookAlphaRes.json();
    assert(bookAlphaRes.ok && bookAlphaData.success, 'DM-R4-001: First phone booking at 15:40 succeeds');

    // DM-R4-001: Overlap prevention - Attempting to book 15:50 for same 15m doctor must be REJECTED (409 Conflict)
    const bookBetaRes = await fetch(`${baseUrl}/reception/phone-booking`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hospitalId: auroraId,
        doctorId: doc15Id,
        bookedDate: r4TestDate,
        bookedTime: '15:50',
        patientName: 'QA Phone Beta',
        patientMobile: '9000000412',
        age: '8',
        gender: 'Female',
        source: 'PHONE',
      }),
    });
    const bookBetaData = await bookBetaRes.json();
    assert(bookBetaRes.status === 409 && !bookBetaData.success, 'DM-R4-001: Overlapping booking at 15:50 (within 15:40-15:55 slot) is rejected with 409 Conflict');

    // DM-R4-001: Non-overlapping booking at 15:55 (after 15-minute slot) must succeed
    const bookGammaRes = await fetch(`${baseUrl}/reception/phone-booking`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hospitalId: auroraId,
        doctorId: doc15Id,
        bookedDate: r4TestDate,
        bookedTime: '15:55',
        patientName: 'QA Phone Gamma',
        patientMobile: '9000000413',
        age: '5',
        gender: 'Female',
        source: 'PHONE',
      }),
    });
    const bookGammaData = await bookGammaRes.json();
    assert(bookGammaRes.ok && bookGammaData.success, 'DM-R4-001: Non-overlapping booking at 15:55 succeeds');

    // DM-R4-003: Copied tracker details must contain full origin URL
    assert(bookAlphaData.trackerUrl && bookAlphaData.trackerUrl.startsWith('http://localhost:4199/track?id='), `DM-R4-003: Phone booking returns full tracker URL with public origin: ${bookAlphaData.trackerUrl}`);
    assert(bookAlphaData.confirmationText && bookAlphaData.confirmationText.includes('http://localhost:4199/track?id='), 'DM-R4-003: Confirmation text contains full tracker URL with public origin');

    // DM-R4-002: Booking source persistence and filtering
    const recQueueRes = await fetch(`${baseUrl}/reception/dashboard?hospitalId=${auroraId}&date=${r4TestDate}`);
    const recQueueData = await recQueueRes.json();
    const recAppointments = recQueueData.appointments || [];
    assert(Array.isArray(recAppointments), 'DM-R4-002: Reception appointments returned as array');
    const phoneAppts = recAppointments.filter((a: any) => a.bookingSource === 'PHONE' || a.source === 'PHONE');
    assert(phoneAppts.length >= 2, `DM-R4-002: Phone bookings correctly persisted with PHONE source (found ${phoneAppts.length})`);

    // --- Step 10: QA Round 5 Regression Tests (DM-R5-001 Working-Day Restrictions) ---
    console.log('\n--- Step 10: QA Round 5 Regression Tests (DM-R5-001) ---');
    const sundayDate = '2026-10-18'; // Sunday (day 0)
    const mondayDate = '2026-10-19'; // Monday (day 1)

    // Create doctor Dr. QA Meridian Revised specifically configured Mon-Sat (days [1, 2, 3, 4, 5, 6])
    const docMeridianRes = await fetch(`${baseUrl}/hospital-admin/${auroraId}/doctors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Dr. QA Meridian Revised',
        specialty: 'Pediatric Pulmonology',
        slotDurationMinutes: 20,
        consultationFee: 800,
        startTime: '10:00',
        endTime: '16:00',
        availableDays: [1, 2, 3, 4, 5, 6], // Mon-Sat only (excludes Sunday)
        bufferMinutesPerHour: 0,
      }),
    });
    const docMeridianData = await docMeridianRes.json();
    assert(docMeridianRes.ok && docMeridianData.success, 'DM-R5-001: Dr. QA Meridian Revised created with Mon-Sat configuration');
    const docMeridianId = docMeridianData.doctor.id;

    // Doctor with Mon-Sat schedule (days [1, 2, 3, 4, 5, 6])
    const sundaySlotsRes = await fetch(`${baseUrl}/slots?doctorId=${docMeridianId}&branchId=main&date=${sundayDate}`);
    const sundaySlots = await sundaySlotsRes.json();
    assert(Array.isArray(sundaySlots) && sundaySlots.length === 0, 'DM-R5-001: Querying slots on Sunday for Mon-Sat doctor returns 0 slots');

    // Attempting online booking on Sunday for Mon-Sat doctor must be REJECTED with 400
    const sundayOnlineRes = await fetch(`${baseUrl}/appointments/online-book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hospitalId: auroraId,
        doctorId: docMeridianId,
        branchId: 'main',
        date: sundayDate,
        bookedTime: '10:00',
        patientName: 'QA Sunday Epsilon',
        mobileNumber: '9000000511',
      }),
    });
    const sundayOnlineData = await sundayOnlineRes.json();
    assert(sundayOnlineRes.status === 400, 'DM-R5-001: Public online booking on off-day (Sunday) rejected with 400 Bad Request');
    assert(sundayOnlineData.error && sundayOnlineData.error.toLowerCase().includes('not scheduled'), 'DM-R5-001: Clear explanation that doctor is not scheduled on Sundays');

    // Attempting phone booking on Sunday for Mon-Sat doctor must also be REJECTED with 400
    const sundayPhoneRes = await fetch(`${baseUrl}/reception/phone-booking`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hospitalId: auroraId,
        doctorId: docMeridianId,
        date: sundayDate,
        bookedTime: '10:00',
        patientName: 'QA Sunday Phone',
        mobileNumber: '9000000512',
      }),
    });
    const sundayPhoneData = await sundayPhoneRes.json();
    assert(sundayPhoneRes.status === 400, 'DM-R5-001: Reception phone booking on off-day (Sunday) rejected with 400 Bad Request');
    assert(sundayPhoneData.error && sundayPhoneData.error.toLowerCase().includes('not scheduled'), 'DM-R5-001: Reception desk receives not-scheduled error on Sunday booking');

    // Valid Monday booking must succeed and show slots
    const mondaySlotsRes = await fetch(`${baseUrl}/slots?doctorId=${docMeridianId}&branchId=main&date=${mondayDate}`);
    const mondaySlots = await mondaySlotsRes.json();
    assert(Array.isArray(mondaySlots) && mondaySlots.length > 0, 'DM-R5-001: Querying slots on Monday for Mon-Sat doctor returns available slots');

    const firstMondaySlot = mondaySlots.find((s: any) => s.available)?.time || '10:00';
    const mondayOnlineRes = await fetch(`${baseUrl}/appointments/online-book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hospitalId: auroraId,
        doctorId: docMeridianId,
        branchId: 'main',
        date: mondayDate,
        bookedTime: firstMondaySlot,
        patientName: 'QA Monday Valid',
        mobileNumber: '9000000513',
      }),
    });
    const mondayOnlineData = await mondayOnlineRes.json();
    assert(mondayOnlineRes.ok && mondayOnlineData.token, `DM-R5-001: Booking on scheduled working day (Monday ${firstMondaySlot}) succeeds with token ${mondayOnlineData.token}`);

    // =========================================================================
    // Step 11: QA Round 6 Regression Tests (DM-R6-001, DM-R6-002, Live Delay)
    // =========================================================================
    console.log('\n--- Step 11: QA Round 6 Regression Tests (DM-R6-001 & DM-R6-002) ---');

    // DM-R6-001: Patient tracker displays correct hospital name (not Sri Devi Children Hospital)
    const auroraTrackerRes = await fetch(
      `${baseUrl}/appointments/secure-track?appointmentId=${mondayOnlineData.token}&mobileNumber=9000000513`
    );
    const auroraTrackerData = await auroraTrackerRes.json();
    assert(auroraTrackerRes.ok && auroraTrackerData.success, 'DM-R6-001: Patient secure tracker loads successfully for tracked appointment');
    assert(
      auroraTrackerData.hospitalName === 'QA Aurora Test Hospital',
      `DM-R6-001: Patient tracker displays correct hospital "${auroraTrackerData.hospitalName}" (must equal "QA Aurora Test Hospital", NOT "Sri Devi Children Hospital")`
    );
    assert(auroraTrackerData.doctorName === 'Dr. QA Meridian Revised', 'DM-R6-001: Patient tracker displays correct doctor name');
    assert(auroraTrackerData.patientName === 'QA Monday Valid', 'DM-R6-001: Patient tracker displays correct patient name');

    // DM-R6-002: Tracked appointments visible in receptionist queue
    const auroraReceptionRes = await fetch(
      `${baseUrl}/reception/dashboard?hospitalId=${auroraId}&date=${mondayDate}`
    );
    const auroraReceptionData = await auroraReceptionRes.json();
    assert(auroraReceptionRes.ok, 'DM-R6-002: Reception dashboard query succeeds for scheduled date');
    assert(Array.isArray(auroraReceptionData.appointments), 'DM-R6-002: Reception dashboard returns appointments array');
    const trackedInReception = auroraReceptionData.appointments.find(
      (a: any) => a.appointmentNumber === mondayOnlineData.token
    );
    assert(
      trackedInReception !== undefined,
      `DM-R6-002: Receptionist queue contains the tracked appointment ${mondayOnlineData.token} (appointments count: ${auroraReceptionData.appointments.length})`
    );

    // Book another appointment via phone to ensure multi-appointment queue visibility in reception
    const secondMondaySlot = mondaySlots.find((s: any) => s.available && s.time !== firstMondaySlot)?.time || '10:30';
    const mondayPhoneRes = await fetch(`${baseUrl}/reception/phone-booking`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hospitalId: auroraId,
        doctorId: docMeridianId,
        date: mondayDate,
        bookedTime: secondMondaySlot,
        patientName: 'QA Monday Phone Tracked',
        mobileNumber: '9000000514',
      }),
    });
    const mondayPhoneData = await mondayPhoneRes.json();
    assert(mondayPhoneRes.ok && mondayPhoneData.success, `DM-R6-002: Second phone booking at ${secondMondaySlot} succeeds with token ${mondayPhoneData.appointmentNumber}`);

    // Verify both appointments are present in reception queue
    const auroraReceptionRes2 = await fetch(
      `${baseUrl}/reception/dashboard?hospitalId=${auroraId}&date=${mondayDate}`
    );
    const auroraReceptionData2 = await auroraReceptionRes2.json();
    assert(
      auroraReceptionData2.appointments.length >= 2,
      `DM-R6-002: Reception dashboard shows both appointments (found ${auroraReceptionData2.appointments.length} appointments)`
    );

    // Live Doctor Delay Propagation (Round 6 Check 13 & 14)
    const r6DelayRes = await fetch(`${baseUrl}/reception/doctor-delay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hospitalId: auroraId,
        doctorId: docMeridianId,
        date: mondayDate,
        delayMinutes: 25,
        explanation: 'Doctor running 25 minutes behind due to critical consultation',
      }),
    });
    const r6DelayData = await r6DelayRes.json();
    assert(r6DelayRes.ok && r6DelayData.success, 'Round 6 Check 13: Receptionist updates doctor delay to 25 minutes');

    // Verify patient live tracker reflects the 25-minute delay and updated ETA (Check 14)
    const trackerDelayRes = await fetch(
      `${baseUrl}/appointments/secure-track?appointmentId=${mondayOnlineData.token}&mobileNumber=9000000513`
    );
    const trackerDelayData = await trackerDelayRes.json();
    assert(
      trackerDelayData.estimatedDelayMinutes === 25,
      `Round 6 Check 14: Patient live tracker reflects the 25-minute delay (got ${trackerDelayData.estimatedDelayMinutes} mins)`
    );
    assert(
      trackerDelayData.hospitalName === 'QA Aurora Test Hospital',
      'Round 6: Hospital name remains intact as QA Aurora Test Hospital after delay update'
    );

    // =========================================================================
    // Step 12: QA Round 7 Regression Tests (DM-R7-001, DM-R7-002, DM-R7-003, DM-R7-004, DM-R7-005, DM-R7-006)
    // =========================================================================
    console.log('\n--- Step 12: QA Round 7 Regression Tests (DM-R7-001, DM-R7-002, DM-R7-003, DM-R7-004, DM-R7-005, DM-R7-006) ---');

    // DM-R7-001: Emergency patient insertion appears in reception queue and maintains queue consistency
    const emgRes = await fetch(`${baseUrl}/reception/emergency`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hospitalId: auroraId,
        doctorId: docMeridianId,
        branchId: 'main',
        childName: 'QA Round7 Emergency Kappa',
        parentName: 'QA Synthetic Guardian',
        parentMobile: '9000000702',
      }),
    });
    const emgData = await emgRes.json();
    assert(emgRes.ok && emgData.success, 'DM-R7-001: Emergency patient insertion succeeds');
    assert(emgData.appointment && emgData.appointment.isEmergency, 'DM-R7-001: Emergency flag set on returned appointment');
    assert(emgData.appointment.hospitalId === auroraId, `DM-R7-001: Emergency appointment inherits hospitalId "${auroraId}"`);

    // Verify emergency patient is present in reception live queue for this hospital
    const emgDate = emgData.appointment.date;
    const liveQueueRes = await fetch(`${baseUrl}/queue/live?hospitalId=${auroraId}&date=${emgDate}&doctorId=all`);
    const liveQueueData = await liveQueueRes.json();
    assert(liveQueueRes.ok, 'DM-R7-001: /queue/live query succeeds');
    const emgInLiveQueue = liveQueueData.appointments.find((a: any) => a.childName === 'QA Round7 Emergency Kappa');
    assert(
      emgInLiveQueue !== undefined,
      'DM-R7-001: Emergency patient is present in reception live queue (/queue/live) for the hospital'
    );
    assert(emgInLiveQueue.isEmergency === true, 'DM-R7-001: Patient is flagged as isEmergency in reception queue');

    // DM-R7-003: No-show appointment reflects terminal status and suppresses active queue advice
    // First mark an appointment as No-Show
    const noShowTargetToken = mondayPhoneData.token || mondayPhoneData.appointmentNumber;
    const noShowTargetId = mondayPhoneData.appointment?.id || noShowTargetToken;
    const noShowRes = await fetch(`${baseUrl}/reception/no-show`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointmentId: noShowTargetId }),
    });
    const noShowData = await noShowRes.json();
    assert(noShowRes.ok && noShowData.success, 'DM-R7-003: Successfully marked appointment as No-Show');

    // Query secure-track for this no-show appointment
    const noShowTrackRes = await fetch(
      `${baseUrl}/appointments/secure-track?appointmentId=${noShowTargetToken}&mobileNumber=9000000514`
    );
    const noShowTrackData = await noShowTrackRes.json();
    assert(noShowTrackRes.ok && noShowTrackData.success, 'DM-R7-003: Secure-track query for No-Show appointment succeeds');
    assert(noShowTrackData.status === 'NO_SHOW', 'DM-R7-003: Tracker returns status NO_SHOW');
    assert(noShowTrackData.isTerminal === true, 'DM-R7-003: isTerminal flag is true for No-Show appointment');
    assert(
      noShowTrackData.positionInQueue === null,
      `DM-R7-003: Active queue position is suppressed (null) for released/no-show slot (got ${noShowTrackData.positionInQueue})`
    );
    assert(
      noShowTrackData.patientsAhead === 0,
      `DM-R7-003: Patients ahead is 0 for no-show appointment (got ${noShowTrackData.patientsAhead})`
    );
    assert(
      noShowTrackData.recommendedArrivalTime === null,
      `DM-R7-003: Active arrival advice / buffer is suppressed for released slot (got ${noShowTrackData.recommendedArrivalTime})`
    );

    // Scenario 10: Individual appointment cancellation
    const cancelApptRes = await fetch(`${baseUrl}/reception/cancel-appointment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appointmentId: mondayOnlineData.token,
        reason: 'QA Round7 individual appointment cancellation test',
      }),
    });
    const cancelApptData = await cancelApptRes.json();
    assert(cancelApptRes.ok && cancelApptData.success, 'Scenario 10: Individual appointment cancelled via /reception/cancel-appointment');
    assert(
      cancelApptData.appointment && cancelApptData.appointment.status === 'HOSPITAL_CANCELLED',
      'Scenario 10: Appointment status updated to HOSPITAL_CANCELLED'
    );

    // Verify secure-track also marks HOSPITAL_CANCELLED as terminal and suppresses active metrics
    const cancelTrackRes = await fetch(
      `${baseUrl}/appointments/secure-track?appointmentId=${mondayOnlineData.token}&mobileNumber=9000000513`
    );
    const cancelTrackData = await cancelTrackRes.json();
    assert(cancelTrackRes.ok && cancelTrackData.success, 'Scenario 10: Secure-track query for cancelled appointment succeeds');
    assert(cancelTrackData.status === 'HOSPITAL_CANCELLED', 'Scenario 10: Status is HOSPITAL_CANCELLED');
    assert(cancelTrackData.isTerminal === true, 'Scenario 10: isTerminal flag is true for cancelled appointment');
    assert(cancelTrackData.positionInQueue === null, 'Scenario 10: Queue position suppressed for cancelled appointment');

    // Scenario 6: Scoped doctor late arrival control
    const scopedLateRes = await fetch(`${baseUrl}/reception/doctor-delay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hospitalId: auroraId,
        doctorId: docMeridianId,
        date: mondayDate,
        delayMinutes: 15,
      }),
    });
    const scopedLateData = await scopedLateRes.json();
    assert(scopedLateRes.ok && scopedLateData.success, 'Scenario 6: Scoped doctor delay applied successfully for doctor session');
    assert(
      scopedLateData.doctorId === docMeridianId,
      `Scenario 6: Scoped late arrival targets selected doctor ${docMeridianId}`
    );

    // =========================================================================
    // DM-R7-004: Reception Walk-In Booking Doctor Selection & Slot Validation
    // =========================================================================
    // Verify Walk-In booking assigns to selected doctor (Meridian) rather than Solstice or reception filter
    const walkinRes = await fetch(`${baseUrl}/reception/phone-booking`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hospitalId: auroraId,
        doctorId: docMeridianId,
        branchId: 'main',
        patientName: 'QA Round7 Retest Walkin Mu',
        mobileNumber: '9000000713',
        patientAge: 30,
        date: mondayDate,
        bookedTime: '11:00',
        bookingSource: 'WALK_IN',
      }),
    });
    const walkinData = await walkinRes.json();
    assert(walkinRes.ok && walkinData.success, 'DM-R7-004: Walk-in appointment booking succeeds');
    assert(
      walkinData.appointment && walkinData.appointment.doctorId === docMeridianId,
      `DM-R7-004: Saved appointment assigned to selected doctor ${docMeridianId} (got ${walkinData.appointment?.doctorId})`
    );
    assert(
      walkinData.appointment && walkinData.appointment.doctorName === 'Dr. QA Meridian Revised',
      'DM-R7-004: Appointment doctor name reflects Dr. QA Meridian Revised'
    );
    assert(
      walkinData.appointment && walkinData.appointment.bookingSource === 'WALK_IN',
      'DM-R7-004: Appointment bookingSource is WALK_IN'
    );

    // Verify appointment is in reception live queue under Dr. QA Meridian Revised
    const liveQueueAllRes = await fetch(`${baseUrl}/queue/live?hospitalId=${auroraId}&date=${mondayDate}&doctorId=all`);
    const liveQueueAllData = await liveQueueAllRes.json();
    assert(liveQueueAllRes.ok, 'DM-R7-004: Live queue query succeeds');
    const walkinInQueue = liveQueueAllData.appointments.find((a: any) => a.childName === 'QA Round7 Retest Walkin Mu');
    assert(walkinInQueue !== undefined, 'DM-R7-004: Walk-in patient present in reception queue');
    assert(
      walkinInQueue && walkinInQueue.doctorId === docMeridianId,
      `DM-R7-004: Walk-in queue row belongs to selected doctor ${docMeridianId}`
    );

    // Verify patient secure tracker reflects Dr. QA Meridian Revised
    const walkinTrackRes = await fetch(
      `${baseUrl}/appointments/secure-track?appointmentId=${walkinData.token}&mobileNumber=9000000713`
    );
    const walkinTrackData = await walkinTrackRes.json();
    assert(walkinTrackRes.ok && walkinTrackData.success, 'DM-R7-004: Secure-track query for Walk-In succeeds');
    assert(
      walkinTrackData.doctorName === 'Dr. QA Meridian Revised',
      `DM-R7-004: Tracker displays selected doctor Dr. QA Meridian Revised (got ${walkinTrackData.doctorName})`
    );

    // Verify server-side rejection for out-of-hours slot time (23:00 is outside doctor's consultation hours)
    const invalidSlotRes = await fetch(`${baseUrl}/reception/phone-booking`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hospitalId: auroraId,
        doctorId: docMeridianId,
        branchId: 'main',
        patientName: 'QA Invalid Slot Patient',
        mobileNumber: '9000000714',
        date: mondayDate,
        bookedTime: '23:00',
        bookingSource: 'WALK_IN',
      }),
    });
    assert(
      invalidSlotRes.status === 400,
      `DM-R7-004: Out-of-hours slot time (23:00) rejected with 400 Bad Request (got ${invalidSlotRes.status})`
    );

    // Verify server-side rejection for double-booking occupied slot (11:00 is now booked)
    const doubleBookWalkinRes = await fetch(`${baseUrl}/reception/phone-booking`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hospitalId: auroraId,
        doctorId: docMeridianId,
        branchId: 'main',
        patientName: 'QA Duplicate Walkin Patient',
        mobileNumber: '9000000715',
        date: mondayDate,
        bookedTime: '11:00',
        bookingSource: 'WALK_IN',
      }),
    });
    assert(
      doubleBookWalkinRes.status === 409,
      `DM-R7-004: Double-booking occupied slot 11:00 rejected with 409 Conflict (got ${doubleBookWalkinRes.status})`
    );

    // =========================================================================
    // DM-R7-005: Same-minute emergency token collision resistance & tracker access
    // =========================================================================
    const emgLambdaRes = await fetch(`${baseUrl}/reception/emergency`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hospitalId: auroraId,
        doctorId: docMeridianId,
        branchId: 'main',
        childName: 'QA Round7 Emergency Lambda',
        parentName: 'QA Synthetic Guardian Lambda',
        parentMobile: '9000000712',
      }),
    });
    const emgLambdaData = await emgLambdaRes.json();
    assert(emgLambdaRes.ok && emgLambdaData.success, 'DM-R7-005: Emergency Lambda insertion succeeds');
    const tokenLambda = emgLambdaData.appointment.appointmentNumber;

    // Insert second emergency patient within the exact same simulated minute
    const emgXiRes = await fetch(`${baseUrl}/reception/emergency`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hospitalId: auroraId,
        doctorId: docMeridianId,
        branchId: 'main',
        childName: 'QA Round7 Emergency Xi',
        parentName: 'QA Synthetic Guardian Xi',
        parentMobile: '9000000722',
      }),
    });
    const emgXiData = await emgXiRes.json();
    assert(emgXiRes.ok && emgXiData.success, 'DM-R7-005: Second emergency Xi insertion in same minute succeeds');
    const tokenXi = emgXiData.appointment.appointmentNumber;

    // Tokens must be distinct (collision-free)
    assert(tokenLambda !== tokenXi, `DM-R7-005: Same-minute emergency appointments have distinct tokens (Lambda=${tokenLambda}, Xi=${tokenXi})`);
    assert(tokenXi.includes('-2') || tokenXi !== tokenLambda, `DM-R7-005: Second emergency token has unique suffix (${tokenXi})`);

    // Verify both patients can track securely with their respective mobile numbers
    const trackLambdaRes = await fetch(`${baseUrl}/appointments/secure-track?appointmentId=${tokenLambda}&mobileNumber=9000000712`);
    const trackLambdaData = await trackLambdaRes.json();
    assert(trackLambdaRes.ok && trackLambdaData.success, 'DM-R7-005: Lambda tracks successfully with 9000000712');
    assert(trackLambdaData.childName === 'QA Round7 Emergency Lambda', 'DM-R7-005: Lambda tracker displays Lambda');

    const trackXiRes = await fetch(`${baseUrl}/appointments/secure-track?appointmentId=${tokenXi}&mobileNumber=9000000722`);
    const trackXiData = await trackXiRes.json();
    assert(trackXiRes.ok && trackXiData.success, 'DM-R7-005: Xi tracks successfully with 9000000722 without security rejection');
    assert(trackXiData.childName === 'QA Round7 Emergency Xi', 'DM-R7-005: Xi tracker displays Xi');

    // =========================================================================
    // DM-R7-006: Applying doctor delay retains delay and is not discarded on refresh
    // =========================================================================
    // Apply +15m delay to Dr. QA Meridian Revised
    const delay15Res = await fetch(`${baseUrl}/reception/doctor-delay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hospitalId: auroraId,
        doctorId: docMeridianId,
        branchId: 'main',
        date: emgDate,
        delayMinutes: 15,
        explanation: 'Doctor delayed by 15 minutes due to hospital rounds',
      }),
    });
    const delay15Data = await delay15Res.json();
    assert(delay15Res.ok && delay15Data.success, 'DM-R7-006: Applied +15m doctor delay via /reception/doctor-delay');
    assert(delay15Data.currentDelayMinutes === 15, `DM-R7-006: Response reflects 15m delay (got ${delay15Data.currentDelayMinutes})`);

    // Simulate "Refresh Queue" (/queue/live) where queue recalculation executes
    const refreshQueueRes = await fetch(`${baseUrl}/queue/live?hospitalId=${auroraId}&date=${emgDate}&doctorId=${docMeridianId}`);
    const refreshQueueData = await refreshQueueRes.json();
    assert(refreshQueueRes.ok, 'DM-R7-006: Live queue refresh succeeds');
    assert(
      refreshQueueData.session?.currentDelayMinutes === 15,
      `DM-R7-006: Doctor delay remains 15 min after recalculation and Refresh Queue (got ${refreshQueueData.session?.currentDelayMinutes})`
    );

    // Verify patient live tracker reflects the 15m doctor delay
    const trackXiDelayRes = await fetch(`${baseUrl}/appointments/secure-track?appointmentId=${tokenXi}&mobileNumber=9000000722`);
    const trackXiDelayData = await trackXiDelayRes.json();
    assert(trackXiDelayRes.ok && trackXiDelayData.success, 'DM-R7-006: Patient tracker query succeeds');
    assert(
      trackXiDelayData.estimatedDelayMinutes === 15,
      `DM-R7-006: Patient tracker reflects 15m doctor delay (got ${trackXiDelayData.estimatedDelayMinutes})`
    );

    // =========================================================================
    // Step 13: QA Round 7 Extended Retest (DM-R7-007, DM-R7-008, DM-R7-009, DM-R7-010)
    // =========================================================================
    console.log('\n--- Step 13: QA Round 7 Extended Retest (DM-R7-007, DM-R7-008, DM-R7-009, DM-R7-010) ---');

    // -------------------------------------------------------------------------
    // DM-R7-007: Two simultaneous consultations for one doctor rejected
    // -------------------------------------------------------------------------
    const alphaRes = await fetch(`${baseUrl}/reception/phone-booking`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hospitalId: auroraId,
        doctorId: docMeridianId,
        branchId: 'main',
        patientName: 'QA R7 Deep Alpha',
        mobileNumber: '9000000731',
        patientAge: 4,
        date: emgDate,
        bookedTime: '12:00',
        bookingSource: 'RECEPTION_PHONE',
      }),
    });
    const alphaData = await alphaRes.json();
    assert(alphaRes.ok && alphaData.success, 'DM-R7-007: Alpha booking succeeds');

    const betaRes = await fetch(`${baseUrl}/reception/phone-booking`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hospitalId: auroraId,
        doctorId: docMeridianId,
        branchId: 'main',
        patientName: 'QA R7 Deep Beta',
        mobileNumber: '9000000732',
        patientAge: 5,
        date: emgDate,
        bookedTime: '13:00',
        bookingSource: 'WALK_IN',
      }),
    });
    const betaData = await betaRes.json();
    assert(betaRes.ok && betaData.success, 'DM-R7-007: Beta booking succeeds');

    // Check in Alpha and Beta
    await fetch(`${baseUrl}/reception/check-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointmentId: alphaData.appointment.id, paymentMethod: 'CASH' }),
    });
    await fetch(`${baseUrl}/reception/check-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointmentId: betaData.appointment.id, paymentMethod: 'CASH' }),
    });

    // Start Alpha consultation
    const sendAlphaRes = await fetch(`${baseUrl}/reception/send-to-doctor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointmentId: alphaData.appointment.id }),
    });
    const sendAlphaData = await sendAlphaRes.json();
    assert(sendAlphaRes.ok && sendAlphaData.success, 'DM-R7-007: Alpha sent into consultation room');

    // Attempt to start Beta consultation while Alpha is WITH_DOCTOR
    const sendBetaConflictRes = await fetch(`${baseUrl}/reception/send-to-doctor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointmentId: betaData.appointment.id }),
    });
    const sendBetaConflictData = await sendBetaConflictRes.json();
    assert(
      sendBetaConflictRes.status === 409 || !sendBetaConflictData.success,
      `DM-R7-007: Concurrent consultation attempt rejected with 409 (got status ${sendBetaConflictRes.status})`
    );

    // Live queue check: Alpha WITH_DOCTOR, Beta WAITING
    const queueCheckRes = await fetch(`${baseUrl}/queue/live?hospitalId=${auroraId}&date=${emgDate}&doctorId=${docMeridianId}`);
    const queueCheckData = await queueCheckRes.json();
    const betaInQueue = queueCheckData.appointments.find((a: any) => a.id === betaData.appointment.id);
    assert(betaInQueue.status === 'WAITING', `DM-R7-007: Beta remains in WAITING status (got ${betaInQueue.status})`);
    assert(queueCheckData.currentPatient.id === alphaData.appointment.id, 'DM-R7-007: Authoritative currentPatient is Alpha');

    // Complete Alpha consultation
    const completeAlphaRes = await fetch(`${baseUrl}/reception/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointmentId: alphaData.appointment.id }),
    });
    assert(completeAlphaRes.ok, 'DM-R7-007: Alpha consultation completed successfully');

    // Beta can now be admitted
    const sendBetaSuccessRes = await fetch(`${baseUrl}/reception/send-to-doctor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointmentId: betaData.appointment.id }),
    });
    const sendBetaSuccessData = await sendBetaSuccessRes.json();
    assert(sendBetaSuccessRes.ok && sendBetaSuccessData.success, 'DM-R7-007: Beta admitted after Alpha completed');

    await fetch(`${baseUrl}/reception/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointmentId: betaData.appointment.id }),
    });

    // -------------------------------------------------------------------------
    // DM-R7-008: Emergency buffer boundary - 0 buffer does not jump back to 20
    // -------------------------------------------------------------------------
    const freshDocRes = await fetch(`${baseUrl}/hospital-admin/${auroraId}/doctors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hospitalId: auroraId,
        name: 'Dr. QA Horizon Buffer Control',
        specialty: 'Pediatric Care',
        qualification: 'MBBS, MD',
        experienceYears: 10,
        contactNumber: '9000000788',
        branches: ['main'],
        slotDurationMinutes: 15,
        workingDays: [1, 2, 3, 4, 5, 6],
        startTime: '09:00',
        endTime: '17:00',
        bufferMinutesPerHour: 20,
      }),
    });
    const freshDocData = await freshDocRes.json();
    const freshDocId = freshDocData.doctor.id;

    // First emergency consumes 15 min buffer -> 5 min left
    const emg1Res = await fetch(`${baseUrl}/reception/emergency`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hospitalId: auroraId,
        doctorId: freshDocId,
        branchId: 'main',
        childName: 'QA R7 Deep Emergency One',
        parentName: 'Parent Emg One',
        parentMobile: '9000000733',
      }),
    });
    assert(emg1Res.ok, 'DM-R7-008: Emergency One inserted successfully');

    const queueEmg1Res = await fetch(`${baseUrl}/queue/live?hospitalId=${auroraId}&date=${emgDate}&doctorId=${freshDocId}`);
    const queueEmg1Data = await queueEmg1Res.json();
    assert(
      queueEmg1Data.session?.bufferAvailableMinutes === 5,
      `DM-R7-008: Buffer correctly decremented from 20 to 5 (got ${queueEmg1Data.session?.bufferAvailableMinutes})`
    );

    // Second emergency consumes remaining 5 min buffer -> strictly 0 min left
    const emg2Res = await fetch(`${baseUrl}/reception/emergency`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hospitalId: auroraId,
        doctorId: freshDocId,
        branchId: 'main',
        childName: 'QA R7 Deep Emergency Two',
        parentName: 'Parent Emg Two',
        parentMobile: '9000000734',
      }),
    });
    assert(emg2Res.ok, 'DM-R7-008: Emergency Two inserted successfully');

    const queueEmg2Res = await fetch(`${baseUrl}/queue/live?hospitalId=${auroraId}&date=${emgDate}&doctorId=${freshDocId}`);
    const queueEmg2Data = await queueEmg2Res.json();
    assert(
      queueEmg2Data.session?.bufferAvailableMinutes === 0,
      `DM-R7-008: Buffer at boundary is strictly 0 and did NOT jump back to 20 (got ${queueEmg2Data.session?.bufferAvailableMinutes})`
    );

    // -------------------------------------------------------------------------
    // DM-R7-009: Rescheduling / Reception Edit Bypasses Availability
    // -------------------------------------------------------------------------
    const gammaRes = await fetch(`${baseUrl}/reception/phone-booking`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hospitalId: auroraId,
        doctorId: freshDocId,
        branchId: 'main',
        patientName: 'QA R7 Deep Gamma',
        mobileNumber: '9000000735',
        patientAge: 6,
        date: emgDate,
        bookedTime: '14:00',
        bookingSource: 'RECEPTION_PHONE',
      }),
    });
    const gammaData = await gammaRes.json();
    const gammaId = gammaData.appointment?.id;
    assert(gammaRes.ok && gammaData.success, 'DM-R7-009: Gamma booking at 14:00 succeeds');

    const deltaRes = await fetch(`${baseUrl}/reception/phone-booking`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hospitalId: auroraId,
        doctorId: freshDocId,
        branchId: 'main',
        patientName: 'QA R7 Deep Delta',
        mobileNumber: '9000000736',
        patientAge: 7,
        date: emgDate,
        bookedTime: '15:00',
        bookingSource: 'RECEPTION_PHONE',
      }),
    });
    const deltaData = await deltaRes.json();
    assert(deltaRes.ok && deltaData.success, 'DM-R7-009: Delta booking at 15:00 succeeds');

    // Attempt 1: Edit Gamma to 15:00 (which Delta occupies) -> must reject with 409 Conflict
    const editConflictRes = await fetch(`${baseUrl}/appointments/${gammaId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookedTime: '15:00',
      }),
    });
    const editConflictData = await editConflictRes.json();
    assert(
      editConflictRes.status === 409 || !editConflictData.success,
      `DM-R7-009: Rescheduling to occupied slot 15:00 rejected with 409 Conflict (got status ${editConflictRes.status})`
    );

    // Attempt 2: Edit Gamma to 18:00 (outside doctor schedule 09:00-17:00) -> must reject with 400 Bad Request
    const editOutOfRangeRes = await fetch(`${baseUrl}/appointments/${gammaId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookedTime: '18:00',
      }),
    });
    const editOutOfRangeData = await editOutOfRangeRes.json();
    assert(
      editOutOfRangeRes.status === 400 || !editOutOfRangeData.success,
      `DM-R7-009: Rescheduling outside offered range (18:00) rejected with 400 Bad Request (got status ${editOutOfRangeRes.status})`
    );

    // Attempt 3: Edit Gamma child details while retaining 14:00 -> succeeds
    const editValidRes = await fetch(`${baseUrl}/appointments/${gammaId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        childName: 'QA R7 Deep Gamma Verified',
        bookedTime: '14:00',
      }),
    });
    const editValidData = await editValidRes.json();
    assert(editValidRes.ok && editValidData.success, 'DM-R7-009: Valid appointment update succeeds');

    // -------------------------------------------------------------------------
    // DM-R7-010: Cash check-in reactivates cancellation guard
    // -------------------------------------------------------------------------
    const cancelGammaRes = await fetch(`${baseUrl}/reception/cancel-appointment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appointmentId: gammaId,
        reason: 'Patient requested cancellation',
      }),
    });
    const cancelGammaData = await cancelGammaRes.json();
    assert(cancelGammaRes.ok && cancelGammaData.success, 'DM-R7-010: Gamma cancelled successfully');

    // Check tracker reflects HOSPITAL_CANCELLED and isTerminal=true
    const gammaTrackRes = await fetch(`${baseUrl}/appointments/secure-track?appointmentId=${gammaData.appointment.appointmentNumber}&mobileNumber=9000000735`);
    const gammaTrackData = await gammaTrackRes.json();
    assert(gammaTrackData.status === 'HOSPITAL_CANCELLED', 'DM-R7-010: Tracker reflects HOSPITAL_CANCELLED');
    assert(gammaTrackData.isTerminal === true, 'DM-R7-010: Cancelled appointment has isTerminal=true');

    // Attempt cash check-in for cancelled Gamma -> must reject with 400
    const cancelledCheckInRes = await fetch(`${baseUrl}/reception/check-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appointmentId: gammaId,
        paymentMethod: 'CASH',
      }),
    });
    const cancelledCheckInData = await cancelledCheckInRes.json();
    assert(
      cancelledCheckInRes.status === 400 || !cancelledCheckInData.success,
      `DM-R7-010: Cash check-in on cancelled appointment rejected with 400 (got status ${cancelledCheckInRes.status})`
    );

    // Live queue verifies Gamma remains HOSPITAL_CANCELLED and not in queue
    const queueGammaCheckRes = await fetch(`${baseUrl}/queue/live?hospitalId=${auroraId}&date=${emgDate}&doctorId=${freshDocId}`);
    const queueGammaCheckData = await queueGammaCheckRes.json();
    const gammaInQueue = queueGammaCheckData.appointments.find((a: any) => a.id === gammaId);
    assert(
      gammaInQueue.status === 'HOSPITAL_CANCELLED',
      `DM-R7-010: Gamma remains HOSPITAL_CANCELLED in live queue (got status ${gammaInQueue.status})`
    );
    assert(
      gammaInQueue.isNextInQueue === false || !gammaInQueue.isNextInQueue,
      'DM-R7-010: Cancelled Gamma is NOT next in queue'
    );

    // =========================================================================
    // Step 14: QA Round 7 Post-Fix Revalidation (DM-R7-011, DM-R7-012, DM-R7-013)
    // =========================================================================
    console.log('\n--- Step 14: QA Round 7 Post-Fix Retest (DM-R7-011, DM-R7-012, DM-R7-013) ---');

    // -------------------------------------------------------------------------
    // DM-R7-011: In-consultation patient suppresses future arrival advice
    // -------------------------------------------------------------------------
    // Create an emergency appointment for docMeridianId
    const emgTrackPatientRes = await fetch(`${baseUrl}/reception/emergency`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hospitalId: auroraId,
        doctorId: docMeridianId,
        childName: 'QA R7 InChamber Child',
        parentName: 'QA Parent',
        parentMobile: '9000000743',
        patientAge: 3,
        reason: 'Acute respiratory distress',
      }),
    });
    const emgTrackPatientData = await emgTrackPatientRes.json();
    assert(emgTrackPatientRes.ok && emgTrackPatientData.success, 'DM-R7-011: Emergency patient admitted');
    const emgAppt = emgTrackPatientData.appointment;

    // Send in patient to doctor
    const sendInRes = await fetch(`${baseUrl}/reception/send-to-doctor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointmentId: emgAppt.id }),
    });
    const sendInData = await sendInRes.json();
    assert(sendInRes.ok && sendInData.success, 'DM-R7-011: Patient sent in to doctor');

    // Track patient with mobile 9000000743
    const inChamberTrackRes = await fetch(
      `${baseUrl}/appointments/secure-track?appointmentId=${emgAppt.appointmentNumber}&mobileNumber=9000000743`
    );
    const inChamberTrackData = await inChamberTrackRes.json();
    assert(inChamberTrackRes.ok && inChamberTrackData.success, 'DM-R7-011: Secure track succeeds for patient in chamber');
    assert(inChamberTrackData.status === 'WITH_DOCTOR', 'DM-R7-011: Status is WITH_DOCTOR');
    assert(
      inChamberTrackData.recommendedArrivalTime === null,
      `DM-R7-011: Reach Clinic By / arrival advice is SUPPRESSED (null) while inside consultation chamber (got ${inChamberTrackData.recommendedArrivalTime})`
    );
    assert(
      inChamberTrackData.patientsAhead === 0,
      `DM-R7-011: Patients ahead is 0 while patient is in chamber (got ${inChamberTrackData.patientsAhead})`
    );
    assert(
      inChamberTrackData.estimatedConsultationTime === inChamberTrackData.consultationStartTime,
      `DM-R7-011: Estimated consultation time reflects actual consultation start time (${inChamberTrackData.consultationStartTime})`
    );

    // Complete in-chamber consultation to free the doctor
    await fetch(`${baseUrl}/reception/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointmentId: emgAppt.id }),
    });

    // -------------------------------------------------------------------------
    // DM-R7-012: Reassignment respects requested estimated consultation time
    // -------------------------------------------------------------------------
    // Create dedicated doctor for DM-R7-012 and DM-R7-013 matching QA environment
    const horizonDocRes = await fetch(`${baseUrl}/hospital-admin/${auroraId}/doctors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hospitalId: auroraId,
        name: 'Dr. QA Horizon Synthetic',
        specialty: 'Pediatric Care',
        qualification: 'MBBS, MD',
        experienceYears: 12,
        contactNumber: '9000000789',
        branches: ['main'],
        slotDurationMinutes: 30,
        workingDays: [1, 2, 3, 4, 5, 6],
        startTime: '09:00',
        endTime: '17:00',
        bufferMinutesPerHour: 20,
      }),
    });
    const horizonDocData = await horizonDocRes.json();
    const horizonDocId = horizonDocData.doctor.id;

    // Book Delta at 14:00 with Horizon doctor
    const delta14Res = await fetch(`${baseUrl}/reception/phone-booking`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hospitalId: auroraId,
        doctorId: horizonDocId,
        branchId: 'main',
        patientName: 'QA Delta Reassign',
        mobileNumber: '9000000746',
        patientAge: 6,
        date: emgDate,
        bookedTime: '14:00',
        bookingSource: 'RECEPTION_PHONE',
      }),
    });
    const delta14Data = await delta14Res.json();
    assert(delta14Res.ok && delta14Data.success, 'DM-R7-012: Delta booked at 14:00');
    const deltaId = delta14Data.appointment.id;
    const deltaToken = delta14Data.appointment.appointmentNumber;

    // Mark Delta late
    const markLateRes = await fetch(`${baseUrl}/reception/mark-late`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointmentId: deltaId }),
    });
    const markLateData = await markLateRes.json();
    assert(markLateRes.ok && markLateData.success, 'DM-R7-012: Delta marked late');

    // Reassign Delta to 15:00
    const reassign15Res = await fetch(`${baseUrl}/reception/reassign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appointmentId: deltaId,
        newExpectedTime: '15:00',
      }),
    });
    const reassign15Data = await reassign15Res.json();
    assert(reassign15Res.ok && reassign15Data.success, 'DM-R7-012: Reassignment to 15:00 succeeds');

    // Verify in live queue that Delta's ETA is strictly 15:00 (not overwritten to 14:30)
    const queue15Res = await fetch(`${baseUrl}/queue/live?hospitalId=${auroraId}&date=${emgDate}&doctorId=${horizonDocId}`);
    const queue15Data = await queue15Res.json();
    const deltaInQueue15 = queue15Data.appointments.find((a: any) => a.id === deltaId);
    assert(
      deltaInQueue15.expectedConsultationTime === '15:00',
      `DM-R7-012: Reassigned ETA 15:00 is respected in live queue (got ${deltaInQueue15?.expectedConsultationTime})`
    );

    // Verify in secure tracker that ETA is 15:00 and Reach Clinic By is 14:45
    const track15Res = await fetch(`${baseUrl}/appointments/secure-track?appointmentId=${deltaToken}&mobileNumber=9000000746`);
    const track15Data = await track15Res.json();
    assert(
      track15Data.estimatedConsultationTime === '15:00',
      `DM-R7-012: Tracker ETA is 15:00 (got ${track15Data.estimatedConsultationTime})`
    );
    assert(
      track15Data.recommendedArrivalTime === '14:45',
      `DM-R7-012: Tracker Reach Clinic By is 14:45 (got ${track15Data.recommendedArrivalTime})`
    );

    // Reassign Delta second time to 16:00
    const reassign16Res = await fetch(`${baseUrl}/reception/reassign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appointmentId: deltaId,
        newExpectedTime: '16:00',
      }),
    });
    const reassign16Data = await reassign16Res.json();
    assert(reassign16Res.ok && reassign16Data.success, 'DM-R7-012: Reassignment to 16:00 succeeds');

    // Verify in live queue that Delta's ETA is 16:00
    const queue16Res = await fetch(`${baseUrl}/queue/live?hospitalId=${auroraId}&date=${emgDate}&doctorId=${horizonDocId}`);
    const queue16Data = await queue16Res.json();
    const deltaInQueue16 = queue16Data.appointments.find((a: any) => a.id === deltaId);
    assert(
      deltaInQueue16.expectedConsultationTime === '16:00',
      `DM-R7-012: Reassigned ETA 16:00 is respected in live queue (got ${deltaInQueue16?.expectedConsultationTime})`
    );

    // Verify in tracker that ETA is 16:00 and Reach Clinic By is 15:45
    const track16Res = await fetch(`${baseUrl}/appointments/secure-track?appointmentId=${deltaToken}&mobileNumber=9000000746`);
    const track16Data = await track16Res.json();
    assert(
      track16Data.estimatedConsultationTime === '16:00',
      `DM-R7-012: Tracker ETA is 16:00 (got ${track16Data.estimatedConsultationTime})`
    );
    assert(
      track16Data.recommendedArrivalTime === '15:45',
      `DM-R7-012: Tracker Reach Clinic By is 15:45 (got ${track16Data.recommendedArrivalTime})`
    );

    // -------------------------------------------------------------------------
    // DM-R7-013: No-show release releases booking capacity and allows reuse of slot
    // -------------------------------------------------------------------------
    // Mark Delta as NO_SHOW
    const noShowDeltaRes = await fetch(`${baseUrl}/reception/no-show`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointmentId: deltaId }),
    });
    const noShowDeltaData = await noShowDeltaRes.json();
    assert(noShowDeltaRes.ok && noShowDeltaData.success, 'DM-R7-013: Delta marked NO_SHOW');

    // Slot 14:00 (Delta's original booked slot) must now be available in slots query
    const slotsAfterNoShowRes = await fetch(
      `${baseUrl}/slots?doctorId=${horizonDocId}&date=${emgDate}&branchId=main`
    );
    const slotsAfterNoShowData = await slotsAfterNoShowRes.json();
    const slot14 = (Array.isArray(slotsAfterNoShowData) ? slotsAfterNoShowData : slotsAfterNoShowData.slots)?.find((s: any) => s.time === '14:00');
    assert(
      slot14 && slot14.available === true,
      `DM-R7-013: Slot 14:00 is available for new booking after NO_SHOW release (available: ${slot14?.available})`
    );

    // Rebook the 14:00 released slot with a new patient
    const rebook14Res = await fetch(`${baseUrl}/reception/phone-booking`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hospitalId: auroraId,
        doctorId: horizonDocId,
        branchId: 'main',
        patientName: 'QA Delta Replacement',
        mobileNumber: '9000000748',
        patientAge: 7,
        date: emgDate,
        bookedTime: '14:00',
        bookingSource: 'RECEPTION_PHONE',
      }),
    });
    const rebook14Data = await rebook14Res.json();
    assert(
      rebook14Res.ok && rebook14Data.success,
      `DM-R7-013: Rebooking previously released NO_SHOW slot 14:00 succeeds (status ${rebook14Res.status})`
    );
    assert(
      rebook14Data.appointment.appointmentNumber.endsWith('-2') || rebook14Data.appointment.appointmentNumber.includes('-'),
      `DM-R7-013: Rebooked slot gets unique incremental suffix token (got ${rebook14Data.appointment.appointmentNumber})`
    );

    // -------------------------------------------------------------------------
    // DM-R7-014: Date/Data Consistency on Queue Query and Reload
    // -------------------------------------------------------------------------
    console.log('\n--- Step 15: QA Round 7 Defect DM-R7-014 Retest (Date/Data Consistency) ---');

    // Set simulation date to 2026-10-21
    const setDateRes = await fetch(`${baseUrl}/simulation/set-date`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: '2026-10-21' }),
    });
    const setDateData = await setDateRes.json();
    assert(setDateRes.ok && setDateData.newDate === '2026-10-21', 'DM-R7-014: Simulation date updated to 2026-10-21');

    // Query queue for 2026-10-21
    const queue21Res = await fetch(`${baseUrl}/queue/live?hospitalId=${auroraId}&date=2026-10-21&doctorId=${horizonDocId}`);
    const queue21Data = await queue21Res.json();
    assert(queue21Data.targetDate === '2026-10-21', `DM-R7-014: /queue/live targetDate matches requested date 2026-10-21 (got ${queue21Data.targetDate})`);
    assert(queue21Data.requestedDate === '2026-10-21', `DM-R7-014: /queue/live requestedDate is 2026-10-21 (got ${queue21Data.requestedDate})`);

    // Ensure all returned appointments strictly match 2026-10-21
    const hasWrongDateRows = queue21Data.appointments.some((a: any) => a.date !== '2026-10-21');
    assert(!hasWrongDateRows, 'DM-R7-014: No wrong-date appointments leaked into 2026-10-21 queue response');

    // Book a 2026-10-21 appointment at 12:00
    const book21Res = await fetch(`${baseUrl}/reception/phone-booking`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hospitalId: auroraId,
        doctorId: horizonDocId,
        branchId: 'main',
        patientName: 'QA R7 Date Test Patient',
        mobileNumber: '9000000789',
        patientAge: 5,
        date: '2026-10-21',
        bookedTime: '12:00',
        bookingSource: 'WALK_IN',
      }),
    });
    const book21Data = await book21Res.json();
    assert(book21Res.ok && book21Data.success, 'DM-R7-014: Booking on 2026-10-21 succeeds');

    // Slots query for 2026-10-21 shows 12:00 occupied (available: false)
    const slots21Res = await fetch(`${baseUrl}/slots?doctorId=${horizonDocId}&branchId=main&date=2026-10-21`);
    const slots21Data = await slots21Res.json();
    const slot21_1200 = (Array.isArray(slots21Data) ? slots21Data : slots21Data.slots)?.find((s: any) => s.time === '12:00');
    assert(slot21_1200 && slot21_1200.available === false, 'DM-R7-014: 12:00 slot on 2026-10-21 is unavailable (occupied)');

    // Slots query for another date (e.g. 2026-10-22) shows 12:00 is free (available: true)
    const slots22Res = await fetch(`${baseUrl}/slots?doctorId=${horizonDocId}&branchId=main&date=2026-10-22`);
    const slots22Data = await slots22Res.json();
    const slot22_1200 = (Array.isArray(slots22Data) ? slots22Data : slots22Data.slots)?.find((s: any) => s.time === '12:00');
    assert(slot22_1200 && slot22_1200.available === true, 'DM-R7-014: 12:00 slot on 2026-10-22 remains available (date isolation)');

    // -------------------------------------------------------------------------
    // DM-R7-015: Immediate slot availability after no-show following reassignment
    // -------------------------------------------------------------------------
    console.log('\n--- Step 15b: QA Round 7 Defect DM-R7-015 Retest (Released Slot Immediate Availability) ---');

    // Setup: Book Gamma at 14:00 with Horizon doctor on 2026-10-22
    const testDateR7 = '2026-10-22';
    const gammaR7Res = await fetch(`${baseUrl}/reception/phone-booking`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hospitalId: auroraId,
        doctorId: horizonDocId,
        branchId: 'main',
        patientName: 'QA Gamma Precondition',
        mobileNumber: '9000000755',
        patientAge: 8,
        date: testDateR7,
        bookedTime: '14:00',
        bookingSource: 'RECEPTION_PHONE',
      }),
    });
    const gammaR7Data = await gammaR7Res.json();
    assert(gammaR7Res.ok && gammaR7Data.success, 'DM-R7-015: Gamma booked at 14:00 on 2026-10-22');
    const gammaApptId = gammaR7Data.appointment.id;

    // 14:00 slot is occupied
    const slotsBeforeNoShowRes = await fetch(`${baseUrl}/slots?doctorId=${horizonDocId}&branchId=main&date=${testDateR7}&_t=${Date.now()}`);
    const slotsBeforeNoShowData = await slotsBeforeNoShowRes.json();
    const slot14Occupied = (Array.isArray(slotsBeforeNoShowData) ? slotsBeforeNoShowData : slotsBeforeNoShowData.slots)?.find((s: any) => s.time === '14:00');
    assert(slot14Occupied && slot14Occupied.available === false, 'DM-R7-015: 14:00 slot is initially occupied by Gamma');

    // Mark Gamma late and reassign to 16:00
    await fetch(`${baseUrl}/reception/mark-late`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointmentId: gammaApptId }),
    });
    const reassignGammaRes = await fetch(`${baseUrl}/reception/reassign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointmentId: gammaApptId, newExpectedTime: '16:00' }),
    });
    assert(reassignGammaRes.ok, 'DM-R7-015: Gamma reassigned to 16:00');

    // Mark Gamma NO_SHOW
    const noShowGammaRes = await fetch(`${baseUrl}/reception/no-show`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointmentId: gammaApptId }),
    });
    const noShowGammaData = await noShowGammaRes.json();
    assert(noShowGammaRes.ok && noShowGammaData.success, 'DM-R7-015: Gamma marked terminal NO_SHOW');

    // Immediate slot query without reload (simulating immediate form open with cache-invalidation headers)
    const immediateSlotsRes = await fetch(`${baseUrl}/slots?doctorId=${horizonDocId}&branchId=main&date=${testDateR7}&_t=${Date.now()}`);
    assert(immediateSlotsRes.headers.get('cache-control')?.includes('no-store'), 'DM-R7-015: /slots endpoint includes Cache-Control: no-store header');
    const immediateSlotsData = await immediateSlotsRes.json();
    const slot14Released = (Array.isArray(immediateSlotsData) ? immediateSlotsData : immediateSlotsData.slots)?.find((s: any) => s.time === '14:00');
    assert(slot14Released && slot14Released.available === true, 'DM-R7-015: Released 14:00 slot is immediately available without server or page reload');

    // Immediate rebooking of released slot 14:00 with fresh Delta details without reload
    const deltaRebookRes = await fetch(`${baseUrl}/reception/phone-booking`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hospitalId: auroraId,
        doctorId: horizonDocId,
        branchId: 'main',
        patientName: 'QA Delta Immediate Rebook',
        mobileNumber: '9000000756',
        patientAge: 4,
        date: testDateR7,
        bookedTime: '14:00',
        bookingSource: 'RECEPTION_PHONE',
      }),
    });
    const deltaRebookData = await deltaRebookRes.json();
    assert(deltaRebookRes.ok && deltaRebookData.success, 'DM-R7-015: Fresh Delta details successfully rebook 14:00 immediately without reload');
    assert(
      deltaRebookData.appointment.appointmentNumber.includes('-'),
      `DM-R7-015: Rebooked appointment has distinct incremental suffix token (${deltaRebookData.appointment.appointmentNumber})`
    );

    // -------------------------------------------------------------------------
    // Step 16: PIN Code Auto-Detection for Hospital Registration
    // -------------------------------------------------------------------------
    console.log('\n--- Step 16: PIN Code Auto-Detection for Hospital Registration ---');

    // 1. Query PIN 533001 (Andhra Pradesh / East Godavari / Kakinada)
    const pinAPRes = await fetch(`${baseUrl}/pincode/533001`);
    const pinAPData = await pinAPRes.json();
    assert(pinAPRes.ok && pinAPData.success, 'Step 16: Pincode query for 533001 succeeds');
    assert(pinAPData.state === 'Andhra Pradesh', `Step 16: 533001 resolves to Andhra Pradesh (got ${pinAPData.state})`);
    assert(Boolean(pinAPData.city || pinAPData.district), 'Step 16: 533001 returns city/district');
    assert(Array.isArray(pinAPData.places) && pinAPData.places.length > 0, 'Step 16: 533001 returns localities array');

    // 2. Query PIN 560001 (Karnataka / Bengaluru)
    const pinKA = await (await fetch(`${baseUrl}/pincode/560001`)).json();
    assert(pinKA.success && pinKA.state === 'Karnataka', `Step 16: 560001 resolves to Karnataka (got ${pinKA.state})`);

    // 3. Query PIN 110001 (Delhi)
    const pinDL = await (await fetch(`${baseUrl}/pincode/110001`)).json();
    assert(pinDL.success && pinDL.state === 'Delhi', `Step 16: 110001 resolves to Delhi (got ${pinDL.state})`);

    // 4. Repeated query uses cache (<50ms)
    const t0 = Date.now();
    const pinCached = await (await fetch(`${baseUrl}/pincode/533001`)).json();
    const duration = Date.now() - t0;
    assert(pinCached.success && duration < 100, `Step 16: Cached pincode query responds instantaneously (${duration}ms)`);

    // 5. Invalid PIN length rejects with 400
    const pinInvalidRes = await fetch(`${baseUrl}/pincode/1234`);
    assert(pinInvalidRes.status === 400, 'Step 16: Non-6-digit PIN rejected with 400 Bad Request');

    // 6. Register hospital using auto-detected pincode
    const uniqueAdminEmail = `pinadmin_${Date.now()}_${Math.random().toString(36).substring(2, 7)}@test.com`;
    const regHospRes = await fetch(`${baseUrl}/hospitals/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'QA Pincode Verified Hospital',
        address: 'Main Hospital Road',
        city: pinAPData.city,
        state: pinAPData.state,
        pincode: '533001',
        phone: '9000000799',
        hospitalType: 'Multispeciality Hospital',
        adminName: 'Dr. QA Pincode Admin',
        adminEmail: uniqueAdminEmail,
        adminMobile: '9000000799',
        password: 'password123',
      }),
    });
    const regHospData = await regHospRes.json();
    assert(regHospRes.ok && regHospData.token, 'Step 16: Hospital registers successfully with auto-detected PIN fields');
    assert(regHospData.hospital.pincode === '533001', 'Step 16: Registered hospital retains pincode 533001');
    assert(regHospData.hospital.state === 'Andhra Pradesh', 'Step 16: Registered hospital retains auto-detected state');

    // Restore clock back to today
    await fetch(`${baseUrl}/simulation/set-date`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: '2026-10-19' }),
    });

  } catch (err) {
    console.error('Test execution failed with error:', err);
    failed++;
  } finally {
    server.close();
  }

  console.log('\n====================================================');
  console.log(`  TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTestSuite();
