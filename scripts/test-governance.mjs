/**
 * End-to-end HTTP API & Role-Based Governance Verification Suite (V2)
 *
 * Runs against a live Next.js server (default: http://127.0.0.1:3099) after
 * `npm run reset:demo`. Verifies role permissions, conflict-of-interest guards,
 * department isolation, formal issue state machine transitions, optimistic
 * version locking, mandatory repair completion evidence, verifier rejection ->
 * reopen -> second attempt -> verified approval, recurrence petitions,
 * deadline extension breach preservation, watchlists, and isolated notifications.
 */

import assert from "node:assert/strict";

const BASE = (process.argv[2] || "http://127.0.0.1:3099").replace(/\/$/, "");

// Minimal 1x1 PNG data URL for valid image attachment checks
const SAMPLE_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

class AgentClient {
  constructor(name) {
    this.name = name;
    this.cookies = new Map();
  }

  _updateCookies(res) {
    const rawList =
      typeof res.headers.getSetCookie === "function"
        ? res.headers.getSetCookie()
        : [];
    for (const raw of rawList) {
      const pair = raw.split(";")[0];
      const eq = pair.indexOf("=");
      if (eq > 0) {
        const k = pair.slice(0, eq).trim();
        const v = pair.slice(eq + 1).trim();
        if (v) this.cookies.set(k, v);
        else this.cookies.delete(k);
      }
    }
  }

  _cookieHeader() {
    if (this.cookies.size === 0) return undefined;
    return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  }

  async request(path, options = {}) {
    const headers = { ...(options.headers || {}) };
    const cookie = this._cookieHeader();
    if (cookie) headers.Cookie = cookie;
    if (options.body && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }
    const res = await fetch(`${BASE}${path}`, {
      ...options,
      headers,
      redirect: "manual",
    });
    this._updateCookies(res);
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      // HTML or empty body
    }
    return { status: res.status, json, text };
  }

  async switchDemoUser(userId) {
    const res = await this.request("/api/auth/demo-switch", {
      method: "POST",
      body: JSON.stringify({ userId }),
    });
    assert.equal(
      res.status,
      200,
      `Demo switch to ${userId} failed: ${res.status} ${res.text}`
    );
    return res.json.user;
  }
}

async function main() {
  const citizen = new AgentClient("citizen");
  const verifier = new AgentClient("verifier");
  const roadsOfficial = new AgentClient("roadsOfficial");
  const drainageOfficial = new AgentClient("drainageOfficial");
  const guest = new AgentClient("guest");

  // 1. Demo switcher & authentication boundaries
  const cUser = await citizen.switchDemoUser("USR-001");
  const vUser = await verifier.switchDemoUser("USR-003");
  const rUser = await roadsOfficial.switchDemoUser("USR-004");
  const dUser = await drainageOfficial.switchDemoUser("USR-005");
  assert.equal(cUser.role, "citizen");
  assert.equal(vUser.role, "verifier");
  assert.equal(rUser.role, "official");
  assert.equal(rUser.departmentId, "DEPT-ROADS");
  assert.equal(dUser.departmentId, "DEPT-DRAINAGE");

  const badSwitch = await guest.request("/api/auth/demo-switch", {
    method: "POST",
    body: JSON.stringify({ userId: "USR-999" }),
  });
  assert.equal(badSwitch.status, 403, "Unknown user demo switch must return 403");

  // 2. Guest cannot mutate issues
  const guestVote = await guest.request("/api/issues/ISS-003", {
    method: "PATCH",
    body: JSON.stringify({ action: "confirm" }),
  });
  assert.equal(guestVote.status, 401);

  // 3. Citizen submits new Road issue with photographic evidence (201)
  const createRes = await citizen.request("/api/issues", {
    method: "POST",
    body: JSON.stringify({
      title: "Collapsed curb inlet at Sector 4 Link Junction",
      category: "road",
      description:
        "Concrete kerb slab collapsed leaving an open edge beside the pedestrian crossing.",
      location: "Sector 4 Road 12 Corner",
      sectorId: "S04",
      coordinates: [-5.5, 4.2],
      photoDataUrl: SAMPLE_PNG,
    }),
  });
  assert.equal(
    createRes.status,
    201,
    `Citizen report creation failed: ${createRes.status} ${createRes.text}`
  );
  const issueId = createRes.json.issue.id;
  const citizenEvidenceId = createRes.json.issue.evidenceIds[0];
  let version = createRes.json.issue.version ?? 1;
  assert.equal(createRes.json.issue.status, "reported");
  assert.equal(createRes.json.issue.departmentId, "DEPT-ROADS");
  assert.ok(citizenEvidenceId, "Citizen photo must generate linked evidence record");

  // 4. Official blocked from filing citizen reports or voting (403)
  const offReport = await roadsOfficial.request("/api/issues", {
    method: "POST",
    body: JSON.stringify({
      title: "Attempted official citizen report",
      category: "road",
      description: "Testing role block on municipal official reporting.",
      location: "Sector 1 Road 2",
      sectorId: "S01",
    }),
  });
  assert.equal(offReport.status, 403, "Official must not submit citizen reports");

  const offVote = await roadsOfficial.request(`/api/issues/${issueId}`, {
    method: "PATCH",
    body: JSON.stringify({ action: "confirm" }),
  });
  assert.equal(offVote.status, 403, "Official must not cast citizen confirmation votes");

  // 5. Citizen single confirmation vote rule (reporter auto-vote dup 409 -> unconfirm 200 -> confirm 200)
  const voteDupSelf = await citizen.request(`/api/issues/${issueId}`, {
    method: "PATCH",
    body: JSON.stringify({ action: "confirm", note: "Duplicate confirm by reporter." }),
  });
  assert.equal(voteDupSelf.status, 409, "Reporter already has initial vote (must return 409)");

  const unvote = await citizen.request(`/api/issues/${issueId}`, {
    method: "PATCH",
    body: JSON.stringify({ action: "unconfirm" }),
  });
  assert.equal(unvote.status, 200);
  version = unvote.json.issue.version;

  const voteReconfirm = await citizen.request(`/api/issues/${issueId}`, {
    method: "PATCH",
    body: JSON.stringify({ action: "confirm", note: "Re-confirmed after field check." }),
  });
  assert.equal(voteReconfirm.status, 200);
  version = voteReconfirm.json.issue.version;

  const voteDup2 = await citizen.request(`/api/issues/${issueId}`, {
    method: "PATCH",
    body: JSON.stringify({ action: "confirm" }),
  });
  assert.equal(voteDup2.status, 409, "Duplicate confirmation vote must return 409");

  // 6. Citizen blocked from administrative intake review (403)
  const citizenReview = await citizen.request(`/api/issues/${issueId}`, {
    method: "PATCH",
    body: JSON.stringify({ action: "review", note: "Trying to review", expectedVersion: version }),
  });
  assert.equal(citizenReview.status, 403, "Citizen must not move issue to under_review");

  // 7. Official blocked from skipping intake review before Verifier reviews (403/422)
  const prematureStart = await roadsOfficial.request(`/api/issues/${issueId}`, {
    method: "PATCH",
    body: JSON.stringify({
      action: "start_repair",
      departmentId: "DEPT-ROADS",
      officialResponse: "Skipping review attempt.",
      estimatedRepairDate: "2026-12-20",
      expectedVersion: version,
    }),
  });
  assert.ok(
    prematureStart.status === 403 || prematureStart.status === 422,
    `Cannot skip intake review from reported (got ${prematureStart.status})`
  );

  // 8. Verifier reviews intake (reported -> under_review) & verifies citizen evidence
  const reviewRes = await verifier.request(`/api/issues/${issueId}`, {
    method: "PATCH",
    body: JSON.stringify({
      action: "review",
      note: "Verified kerb failure hazard on Sector 4 corner.",
      expectedVersion: version,
    }),
  });
  assert.equal(reviewRes.status, 200, `Verifier review failed: ${reviewRes.text}`);
  assert.equal(reviewRes.json.issue.status, "under_review");
  version = reviewRes.json.issue.version;

  const evVerifyNoReason = await verifier.request(
    `/api/evidence/${citizenEvidenceId}/verify`,
    {
      method: "POST",
      body: JSON.stringify({ action: "verified", reason: "ok" }),
    }
  );
  assert.equal(evVerifyNoReason.status, 422, "Evidence moderation requires a real reason");

  const evVerify = await verifier.request(`/api/evidence/${citizenEvidenceId}/verify`, {
    method: "POST",
    body: JSON.stringify({
      action: "verified",
      reason: "EXIF timestamp and intersection curb landmark match Sector 4 corner.",
    }),
  });
  assert.equal(evVerify.status, 200);
  assert.equal(evVerify.json.evidence.status, "verified");
  version += 1; // Linked issue accountability timeline & version incremented by evidence verification

  // 9. Department isolation: Drainage Official cannot manage DEPT-ROADS issue (403)
  const crossDeptStart = await drainageOfficial.request(`/api/issues/${issueId}`, {
    method: "PATCH",
    body: JSON.stringify({
      action: "start_repair",
      departmentId: "DEPT-ROADS",
      officialResponse: "Drainage official cross-dept attempt.",
      estimatedRepairDate: "2026-12-25",
      expectedVersion: version,
    }),
  });
  assert.equal(crossDeptStart.status, 403, "Cross-department official mutation must fail");

  // 10. Roads Official publishes response, sets ETA, links work order & moves to in_progress
  const startRes = await roadsOfficial.request(`/api/issues/${issueId}`, {
    method: "PATCH",
    body: JSON.stringify({
      action: "start_repair",
      departmentId: "DEPT-ROADS",
      assignedTeam: "DNCC Zone-3 Road Crew",
      officialResponse:
        "Engineering crew scheduled to replace collapsed precast curb slabs.",
      workOrderRef: "WO-2026-S04-91",
      projectId: "P-R01",
      estimatedRepairDate: "2026-12-28",
      expectedVersion: version,
    }),
  });
  assert.equal(startRes.status, 200, `Start repair failed: ${startRes.text}`);
  assert.equal(startRes.json.issue.status, "in_progress");
  version = startRes.json.issue.version;

  // 11. Stale version conflict (409) & direct status bypass blocked (422)
  const staleRes = await roadsOfficial.request(`/api/issues/${issueId}`, {
    method: "PATCH",
    body: JSON.stringify({
      action: "extend_deadline",
      newDate: "2027-01-05",
      reason: "Stale check",
      expectedVersion: version - 1,
    }),
  });
  assert.equal(staleRes.status, 409, "Stale expectedVersion must return 409");

  const bypassRes = await roadsOfficial.request(`/api/issues/${issueId}`, {
    method: "PATCH",
    body: JSON.stringify({ action: "resolve", status: "resolved" }),
  });
  assert.equal(bypassRes.status, 422, "Raw direct resolve bypass must return 422");

  // 12. Repair completion requires valid evidence & notes (422 when missing, 200 when provided)
  const incompleteRepair = await roadsOfficial.request(`/api/issues/${issueId}`, {
    method: "PATCH",
    body: JSON.stringify({
      action: "submit_repair",
      resolutionNotes: "Done",
      completionDate: "2026-11-26",
      evidenceTitle: "After",
      expectedVersion: version,
    }),
  });
  assert.equal(incompleteRepair.status, 422, "Repair submission without photo must fail");

  const repairSubmit1 = await roadsOfficial.request(`/api/issues/${issueId}`, {
    method: "PATCH",
    body: JSON.stringify({
      action: "submit_repair",
      resolutionNotes: "Installed replacement concrete kerb units and compacted backfill.",
      completionDate: "2026-11-26",
      workOrderRef: "WO-2026-S04-91",
      evidenceTitle: "Curb slab replacement photo — Sector 4",
      photoDataUrl: SAMPLE_PNG,
      expectedVersion: version,
    }),
  });
  assert.equal(repairSubmit1.status, 200, `Repair submit failed: ${repairSubmit1.text}`);
  assert.equal(repairSubmit1.json.issue.status, "awaiting_verification");
  version = repairSubmit1.json.issue.version;

  // 13. Official cannot self-certify own submitted repair (403)
  const selfInspect = await roadsOfficial.request(`/api/issues/${issueId}`, {
    method: "PATCH",
    body: JSON.stringify({
      action: "inspect_repair",
      decision: "approved",
      notes: "Self approval attempt",
      expectedVersion: version,
    }),
  });
  assert.equal(selfInspect.status, 403, "Official must not approve own repair");

  // 14. Verifier rejects Repair Attempt #1 -> status becomes reopened + conflict-of-interest check on verifier photo
  const rejectRes = await verifier.request(`/api/issues/${issueId}`, {
    method: "PATCH",
    body: JSON.stringify({
      action: "inspect_repair",
      decision: "rejected",
      notes: "Joint grout missing along 2-meter catch-pit apron; ponding observed.",
      evidenceTitle: "Independent inspection finding photo",
      photoDataUrl: SAMPLE_PNG,
      expectedVersion: version,
    }),
  });
  assert.equal(rejectRes.status, 200, `Verifier reject failed: ${rejectRes.text}`);
  assert.equal(rejectRes.json.issue.status, "reopened");
  assert.notEqual(rejectRes.json.issue.resolutionVerification, "verified");
  assert.equal(rejectRes.json.issue.repairAttempts.length, 1);
  assert.equal(rejectRes.json.issue.repairAttempts[0].verification.decision, "rejected");
  version = rejectRes.json.issue.version;

  const verifierUploadedEv =
    rejectRes.json.issue.evidenceIds[rejectRes.json.issue.evidenceIds.length - 1];
  const selfVerifyEv = await verifier.request(
    `/api/evidence/${verifierUploadedEv}/verify`,
    {
      method: "POST",
      body: JSON.stringify({
        action: "verified",
        reason: "Self-verification conflict test should fail.",
      }),
    }
  );
  assert.equal(
    selfVerifyEv.status,
    403,
    "Verifier must not moderate evidence they uploaded themselves"
  );

  // 15. Reopened -> Official restarts repair -> Submits Attempt #2 -> Verifier approves -> Resolved (Verified)
  const restartRes = await roadsOfficial.request(`/api/issues/${issueId}`, {
    method: "PATCH",
    body: JSON.stringify({
      action: "start_repair",
      departmentId: "DEPT-ROADS",
      assignedTeam: "DNCC Rapid Patch Unit",
      officialResponse:
        "Re-dispatched crew to seal apron joints and restore positive drainage.",
      workOrderRef: "WO-2026-S04-91B",
      estimatedRepairDate: "2026-12-30",
      expectedVersion: version,
    }),
  });
  assert.equal(restartRes.status, 200);
  version = restartRes.json.issue.version;

  const repairSubmit2 = await roadsOfficial.request(`/api/issues/${issueId}`, {
    method: "PATCH",
    body: JSON.stringify({
      action: "submit_repair",
      resolutionNotes: "Sealed kerb apron with epoxy mortar and verified slope test.",
      completionDate: "2026-11-27",
      workOrderRef: "WO-2026-S04-91B",
      evidenceTitle: "Post-rework curb apron verification photo",
      photoDataUrl: SAMPLE_PNG,
      expectedVersion: version,
    }),
  });
  assert.equal(repairSubmit2.status, 200);
  assert.equal(repairSubmit2.json.issue.status, "awaiting_verification");
  version = repairSubmit2.json.issue.version;

  const approveRes = await verifier.request(`/api/issues/${issueId}`, {
    method: "PATCH",
    body: JSON.stringify({
      action: "inspect_repair",
      decision: "approved",
      notes: "Field check passed: kerb flush, joints sealed, no standing water.",
      expectedVersion: version,
    }),
  });
  assert.equal(approveRes.status, 200);
  assert.equal(approveRes.json.issue.status, "resolved");
  assert.equal(approveRes.json.issue.resolutionVerification, "verified");
  assert.equal(approveRes.json.issue.repairAttempts.length, 2);
  version = approveRes.json.issue.version;

  // 16. Citizen submits recurrence petition -> Verifier approves -> Reopened
  const recSubmit = await citizen.request(`/api/issues/${issueId}`, {
    method: "PATCH",
    body: JSON.stringify({
      action: "submit_recurrence",
      reason: "Heavy truck mounted the fresh kerb cracking the west corner slab.",
      photoDataUrl: SAMPLE_PNG,
      expectedVersion: version,
    }),
  });
  assert.equal(recSubmit.status, 200);
  const reqId = recSubmit.json.issue.recurrenceRequests[0].id;
  version = recSubmit.json.issue.version;

  const recApprove = await verifier.request(`/api/issues/${issueId}`, {
    method: "PATCH",
    body: JSON.stringify({
      action: "review_recurrence",
      requestId: reqId,
      decision: "approved",
      reviewNotes: "Site inspection confirms corner slab fracture; reopening.",
      expectedVersion: version,
    }),
  });
  assert.equal(recApprove.status, 200);
  assert.equal(recApprove.json.issue.status, "reopened");

  // 17. Overdue deadline extension preserves slaBreachedAt + appends deadlineHistory
  // First verify Roads Official is blocked on DEPT-LIGHTING issue ISS-006 (403)
  const crossDeptExtend = await roadsOfficial.request("/api/issues/ISS-006", {
    method: "PATCH",
    body: JSON.stringify({
      action: "extend_deadline",
      newDate: "2026-12-31",
      reason: "Unauthorized cross-dept extension attempt.",
    }),
  });
  assert.equal(crossDeptExtend.status, 403);

  // Register a Lighting & Waste Official (tests /api/auth/register + department assignment)
  const lightingOfficial = new AgentClient("lightingOfficial");
  const regLighting = await lightingOfficial.request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({
      name: "Engr. Tariqul Haque",
      email: "tariqul.lighting@citytrace.demo",
      password: "citytrace123",
      role: "official",
      sectorId: "S03",
      departmentId: "DEPT-LIGHTING",
    }),
  });
  assert.equal(
    regLighting.status,
    201,
    `Official registration failed: ${regLighting.status} ${regLighting.text}`
  );

  const extendRes = await lightingOfficial.request("/api/issues/ISS-006", {
    method: "PATCH",
    body: JSON.stringify({
      action: "extend_deadline",
      newDate: "2026-12-31",
      reason: "Utility duct relocation awaiting DESCO clearance.",
    }),
  });
  assert.equal(extendRes.status, 200, `Deadline extension failed: ${extendRes.text}`);
  assert.ok(
    extendRes.json.issue.slaBreachedAt,
    "Historical SLA breach timestamp must remain preserved after deadline extension"
  );
  assert.ok(
    (extendRes.json.issue.deadlineHistory?.length ?? 0) >= 3,
    "Deadline extension history must append without overwriting prior entries"
  );

  // 18. Watchlist toggle & isolated per-user notifications + SSR persistence
  const watchRes = await citizen.request("/api/watchlist", {
    method: "POST",
    body: JSON.stringify({ entityType: "issue", entityId: issueId }),
  });
  assert.equal(watchRes.status, 200);
  assert.ok(watchRes.json.watchlist.issues.includes(issueId));

  const citizenNotifs = await citizen.request("/api/notifications");
  assert.equal(citizenNotifs.status, 200);
  assert.ok(
    citizenNotifs.json.notifications.length > 0,
    "Citizen should have isolated notifications"
  );
  const firstNotifId = citizenNotifs.json.notifications[0].id;
  const markOne = await citizen.request("/api/notifications", {
    method: "PATCH",
    body: JSON.stringify({ notificationId: firstNotifId }),
  });
  assert.equal(markOne.status, 200);

  const pageHtml = await citizen.request(`/civic-issues/${issueId}`);
  assert.equal(pageHtml.status, 200);
  assert.ok(
    pageHtml.text.includes("Collapsed curb inlet at Sector 4 Link Junction"),
    "Mutated issue record must persist across SSR page render"
  );

  console.log("ALL 18 GOVERNANCE ACCEPTANCE CHECKS PASSED");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
