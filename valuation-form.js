/*
 * Black Sky Bravo — Valuation Form v3
 * Updated 03/06/2026
 * Deploy: thesulfurgroup/black-sky repo → jsDelivr CDN
 *
 * This script renders the full form into any element with
 * id="bsb-valuation-form" and handles all logic.
 *
 * CONFIGURATION:
 * Edit WEBHOOK_URL and SECTOR_DATA below to adjust behavior.
 * Commit to main branch, CDN purge runs automatically.
 *
 * VALUATION ALGORITHM:
 * Search for "VALUATION ENGINE" to find and tweak multipliers.
 * Each modifier is clearly labeled with its impact percentage.
 */
(function () {
  "use strict";

  /* ═══════════════════════════════════════════════════
     CONFIG — EDIT THESE
     ═══════════════════════════════════════════════════ */

  // Google Apps Script Web App URL (see bsb-webhook-apps-script.js)
  var WEBHOOK_URL = "";

  // CTA link on the results page
  var CTA_URL = "/contact";
  var CTA_TEXT = "Schedule a Confidential Call";

  /* ═══════════════════════════════════════════════════
     VALUATION ENGINE — SECTOR DATA
     
     lm/hm = low/high EV/Revenue multiples
     el/eh = EBITDA multiple range shown to user
     
     To adjust: change values here, commit, purge CDN.
     ═══════════════════════════════════════════════════ */
  var SD = {
    mro:             { l: "Maintenance & MRO",       lm: 0.8,  hm: 1.6,  el: 3.5, eh: 7.0 },
    training:        { l: "Training & Simulation",   lm: 0.6,  hm: 1.3,  el: 2.5, eh: 6.0 },
    parts:           { l: "Parts & Supply Chain",    lm: 0.7,  hm: 1.5,  el: 4.0, eh: 8.0 },
    flight_ops:      { l: "Flight Operations",       lm: 0.7,  hm: 1.4,  el: 3.0, eh: 6.5 },
    fbo:             { l: "FBO & Ground Services",   lm: 1.0,  hm: 2.0,  el: 4.0, eh: 9.0 },
    software:        { l: "Software & Technology",   lm: 0.9,  hm: 1.8,  el: 4.0, eh: 9.0 },
    infrastructure:  { l: "Infrastructure & OEM",    lm: 0.8,  hm: 1.6,  el: 3.5, eh: 7.5 },
    other:           { l: "Other Aviation Niche",    lm: 0.6,  hm: 1.4,  el: 3.0, eh: 7.0 }
  };

  /* Revenue midpoints ($M) for each range bucket */
  var RM = { "1_3": 2, "3_5": 4, "5_10": 7.5, "10_20": 15, "20_30": 25, "30_plus": 40 };

  /* Display labels */
  var RL = { "1_3": "$1M – $3M", "3_5": "$3M – $5M", "5_10": "$5M – $10M", "10_20": "$10M – $20M", "20_30": "$20M – $30M", "30_plus": "$30M+" };
  var YL = { "1_5": "1 – 5 yrs", "5_10": "5 – 10 yrs", "10_20": "10 – 20 yrs", "20_plus": "20+ yrs" };
  var EL = { "1_10": "1 – 10", "10_25": "10 – 25", "25_50": "25 – 50", "50_100": "50 – 100", "100_plus": "100+" };

  var TOTAL_STEPS = 4;
  var generatedCode = "", emailVerified = false;

  /* ═══════════════════════════════════════════════════
     HTML TEMPLATE
     ═══════════════════════════════════════════════════ */
  function buildHTML() {
    return '' +
    '<div class="bsb-form-wrapper" id="bsbForm">' +
      '<div class="bsb-progress">' +
        '<div class="bsb-progress-bar active" id="prog1"></div>' +
        '<div class="bsb-progress-bar" id="prog2"></div>' +
        '<div class="bsb-progress-bar" id="prog3"></div>' +
        '<div class="bsb-progress-bar" id="prog4"></div>' +
      '</div>' +

      /* Step 1 */
      '<div class="bsb-step active" id="step1">' +
        '<div class="bsb-step-label">Step 1 of 4</div>' +
        '<div class="bsb-step-title">Tell us about your business.</div>' +
        '<div class="bsb-step-subtitle">A few quick facts so we can estimate a fair value range.</div>' +
        '<div class="bsb-field">' +
          '<label>What type of aviation business? <span class="req">*</span></label>' +
          '<div class="bsb-tiles">' +
            tile("sector", "mro", "Maintenance & MRO", "Repair, overhaul, inspections, avionics, interiors") +
            tile("sector", "training", "Training & Simulation", "Flight schools, Part 61/141, simulators, recurrent") +
            tile("sector", "parts", "Parts & Supply Chain", "Sales, distribution, rotable exchange, logistics") +
            tile("sector", "flight_ops", "Flight Operations", "Charter, cargo, medevac, aerial, ag, drone/UAS") +
            tile("sector", "fbo", "FBO & Ground Services", "Fuel, ramp, hangar, de-icing, airport support") +
            tile("sector", "software", "Software & Technology", "SaaS, maintenance software, compliance, AI/data") +
            tile("sector", "infrastructure", "Infrastructure & OEM", "Manufacturing, retrofit, GSE, simulators, tooling") +
            tile("sector", "other", "Other Aviation Niche", "Consulting, brokerage, leasing, staffing, finance") +
          '</div>' +
          '<div class="error-msg" id="sectorError">Please select a sector.</div>' +
        '</div>' +
        '<div class="bsb-field">' +
          '<label for="revenue">Approximate annual revenue <span class="req">*</span></label>' +
          '<div class="bsb-select-wrap">' +
            '<select id="revenue"><option value="" disabled selected>Select range</option>' +
            '<option value="1_3">$1M – $3M</option><option value="3_5">$3M – $5M</option>' +
            '<option value="5_10">$5M – $10M</option><option value="10_20">$10M – $20M</option>' +
            '<option value="20_30">$20M – $30M</option><option value="30_plus">$30M+</option></select>' +
          '</div>' +
          '<div class="error-msg" id="revenueError">Please select a revenue range.</div>' +
        '</div>' +
        '<div class="bsb-row">' +
          '<div class="bsb-field">' +
            '<label for="years">Years in operation <span class="req">*</span></label>' +
            '<div class="bsb-select-wrap"><select id="years"><option value="" disabled selected>Select</option>' +
            '<option value="1_5">1 – 5 years</option><option value="5_10">5 – 10 years</option>' +
            '<option value="10_20">10 – 20 years</option><option value="20_plus">20+ years</option></select></div>' +
            '<div class="error-msg" id="yearsError">Required.</div>' +
          '</div>' +
          '<div class="bsb-field">' +
            '<label for="employees">Number of employees <span class="req">*</span></label>' +
            '<div class="bsb-select-wrap"><select id="employees"><option value="" disabled selected>Select</option>' +
            '<option value="1_10">1 – 10</option><option value="10_25">10 – 25</option>' +
            '<option value="25_50">25 – 50</option><option value="50_100">50 – 100</option>' +
            '<option value="100_plus">100+</option></select></div>' +
            '<div class="error-msg" id="employeesError">Required.</div>' +
          '</div>' +
        '</div>' +
        '<div class="bsb-actions bsb-actions-single">' +
          '<button type="button" class="bsb-btn bsb-btn-primary" onclick="bsbGoToStep(2)">Continue <span class="bsb-btn-arrow">→</span></button>' +
        '</div>' +
      '</div>' +

      /* Step 2 */
      '<div class="bsb-step" id="step2">' +
        '<div class="bsb-step-label">Step 2 of 4</div>' +
        '<div class="bsb-step-title">A few things that affect value.</div>' +
        '<div class="bsb-step-subtitle">These questions help us give you a more realistic range. Answer what you can.</div>' +
        inlineQ("litigation", "Any pending litigation or legal threats against the business or its owners?", ["none|None", "minor|Minor / resolved", "active|Active / pending"]) +
        inlineQ("faa", "Any FAA certification or compliance issues we should know about?", ["clean|All clean", "minor|Minor findings", "issues|Open issues"]) +
        inlineQ("workforce", "Is the majority of your staff W-2 employees or 1099 contractors?", ["employees|Mostly W-2", "mixed|Mix of both", "contractors|Mostly 1099"]) +
        inlineQ("wageIssues", "Any employee, wage, or labor-related disputes (past or present)?", ["none|None", "resolved|Resolved", "active|Active / pending"]) +
        '<div class="bsb-divider"></div>' +
        inlineQ("concentration", "Does any single customer account for more than 30% of revenue?", ["diversified|No, diversified", "some|One is 30–50%", "heavy|One is 50%+"]) +
        inlineQ("revenueType", "What best describes your revenue?", ["contract|Mostly contracted", "mixed|Mix", "transactional|Mostly one-off"]) +
        inlineQ("realEstate", "Do you own or lease your primary facility?", ["own|Own", "lease_long|Lease (5+ yrs)", "lease_short|Lease (< 5 yrs)"]) +
        '<div class="bsb-divider"></div>' +
        inlineQ("ownerDep", "How dependent is the business on you personally?", ["low|Runs without me", "moderate|Somewhat involved", "high|I am the business"]) +
        '<div class="bsb-field">' +
          '<label for="earnout">How long would you stay on post-sale as part of an earnout? <span class="req">*</span></label>' +
          '<div class="bsb-select-wrap"><select id="earnout"><option value="" disabled selected>Select</option>' +
          '<option value="0_6">Less than 6 months</option><option value="6_12">6 – 12 months</option>' +
          '<option value="12_24">1 – 2 years</option><option value="24_36">2 – 3 years</option>' +
          '<option value="36_plus">3+ years</option></select></div>' +
          '<div class="error-msg" id="earnoutError">Required.</div>' +
        '</div>' +
        '<div class="bsb-actions">' +
          '<button type="button" class="bsb-btn bsb-btn-back" onclick="bsbGoToStep(1)">← Back</button>' +
          '<button type="button" class="bsb-btn bsb-btn-primary" onclick="bsbGoToStep(3)">Continue <span class="bsb-btn-arrow">→</span></button>' +
        '</div>' +
      '</div>' +

      /* Step 3 */
      '<div class="bsb-step" id="step3">' +
        '<div class="bsb-step-label">Step 3 of 4</div>' +
        '<div class="bsb-step-title">Where should we send this?</div>' +
        '<div class="bsb-step-subtitle">We\'ll follow up with a more detailed analysis if you want one. No pressure, no spam.</div>' +
        '<div class="bsb-row">' +
          '<div class="bsb-field"><label for="firstName">First name <span class="req">*</span></label>' +
            '<input type="text" id="firstName" placeholder="First name" autocomplete="given-name" />' +
            '<div class="error-msg" id="firstNameError">Required.</div></div>' +
          '<div class="bsb-field"><label for="lastName">Last name <span class="req">*</span></label>' +
            '<input type="text" id="lastName" placeholder="Last name" autocomplete="family-name" />' +
            '<div class="error-msg" id="lastNameError">Required.</div></div>' +
        '</div>' +
        '<div class="bsb-field"><label for="companyName">Company name <span class="req">*</span></label>' +
          '<input type="text" id="companyName" placeholder="Your aviation business" autocomplete="organization" />' +
          '<div class="error-msg" id="companyNameError">Required.</div></div>' +
        '<div class="bsb-field"><label for="email">Work email <span class="req">*</span></label>' +
          '<div class="bsb-verify-row">' +
            '<input type="email" id="email" placeholder="you@company.com" autocomplete="email" />' +
            '<button type="button" class="bsb-verify-btn" id="verifyBtn" onclick="bsbSendVerification()">Verify</button>' +
          '</div>' +
          '<div class="error-msg" id="emailError">Please enter a valid email address.</div>' +
          '<div class="bsb-email-status" id="emailStatus" style="display:none;"></div></div>' +
        '<div class="bsb-field" id="codeField" style="display:none;">' +
          '<label for="verifyCode">Enter the 6-digit code we sent <span class="req">*</span></label>' +
          '<input type="text" id="verifyCode" placeholder="000000" maxlength="6" inputmode="numeric" pattern="[0-9]*" autocomplete="one-time-code" />' +
          '<div class="error-msg" id="codeError">Code doesn\'t match. Check your email and try again.</div></div>' +
        '<div class="bsb-field"><label for="phone">Phone <span class="opt">(optional)</span></label>' +
          '<input type="tel" id="phone" placeholder="(555) 123-4567" autocomplete="tel" /></div>' +
        '<div class="bsb-actions">' +
          '<button type="button" class="bsb-btn bsb-btn-back" onclick="bsbGoToStep(2)">← Back</button>' +
          '<button type="button" class="bsb-btn bsb-btn-primary" id="submitBtn" onclick="bsbSubmitForm()">Get Value + Terms <span class="bsb-btn-arrow">→</span></button>' +
        '</div>' +
      '</div>' +

      /* Step 4 */
      '<div class="bsb-step" id="step4">' +
        '<div class="bsb-step-label">Your Estimate</div>' +
        '<div class="bsb-step-title">Here\'s what we see.</div>' +
        '<div class="bsb-step-subtitle">Adjusted for the risk and structure factors you provided.</div>' +
        '<div class="bsb-result-card">' +
          '<div class="bsb-result-label">Estimated Enterprise Value</div>' +
          '<div class="bsb-result-range" id="resultRange"></div>' +
          '<div class="bsb-result-note" id="resultMultiple"></div></div>' +
        '<div class="bsb-result-details" id="resultDetails"></div>' +
        '<div class="bsb-adjustments" id="adjustments"></div>' +
        '<div class="bsb-result-cta-text">' +
          'This is a preliminary range based on sector benchmarks, comparable transactions, and the risk factors you shared. ' +
          'A real valuation accounts for margins, balance sheet quality, fleet condition, customer contracts, and more. ' +
          'If the numbers make sense, let\'s have a real conversation.</div>' +
        '<div class="bsb-actions bsb-actions-single">' +
          '<a href="' + CTA_URL + '" class="bsb-btn bsb-btn-primary" style="text-decoration:none;">' + CTA_TEXT + ' <span class="bsb-btn-arrow">→</span></a></div>' +
        '<div class="bsb-legal">' +
          'This estimate is for informational purposes only and does not constitute a formal offer, valuation opinion, or commitment of any kind. ' +
          'Actual transaction values depend on due diligence, financial performance, market conditions, and negotiated terms. ' +
          'Black Sky Bravo makes no representations or warranties regarding the accuracy of this estimate.</div>' +
      '</div>' +
    '</div>';
  }

  /* Template helpers */
  function tile(name, val, title, desc) {
    return '<label class="bsb-tile"><input type="radio" name="' + name + '" value="' + val + '" />' +
      '<div class="bsb-tile-label"><span class="bsb-tile-name">' + title + '</span>' +
      '<span class="bsb-tile-desc">' + desc + '</span></div></label>';
  }

  function inlineQ(name, label, opts) {
    var html = '<div class="bsb-field"><label>' + label + ' <span class="req">*</span></label><div class="bsb-inline-opts">';
    opts.forEach(function (o) {
      var parts = o.split("|");
      html += '<label class="bsb-inline-opt"><input type="radio" name="' + name + '" value="' + parts[0] + '" />' +
        '<div class="bsb-inline-opt-label">' + parts[1] + '</div></label>';
    });
    html += '</div><div class="error-msg" id="' + name + 'Error">Please select one.</div></div>';
    return html;
  }

  /* ═══════════════════════════════════════════════════
     INIT — Render into target element
     ═══════════════════════════════════════════════════ */
  function init() {
    var target = document.getElementById("bsb-valuation-form");
    if (!target) return;
    target.innerHTML = buildHTML();
    bindEvents();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  /* ═══════════════════════════════════════════════════
     NAVIGATION
     ═══════════════════════════════════════════════════ */
  window.bsbGoToStep = function (n) {
    if (n === 2 && !v1()) return;
    if (n === 3 && !v2()) return;
    if (n === 4 && !v3()) return;
    document.querySelectorAll(".bsb-step").forEach(function (s) { s.classList.remove("active"); });
    document.getElementById("step" + n).classList.add("active");
    for (var i = 1; i <= TOTAL_STEPS; i++) document.getElementById("prog" + i).classList.toggle("active", i <= n);
    var el = document.getElementById("bsbForm");
    window.scrollTo({ top: el.getBoundingClientRect().top + window.pageYOffset - 80, behavior: "smooth" });
  };

  /* ═══════════════════════════════════════════════════
     VALIDATION
     ═══════════════════════════════════════════════════ */
  function gR(name) { var r = document.querySelector('input[name="' + name + '"]:checked'); return r ? r.value : null; }
  function se(id, m) { var el = document.getElementById(id); if (m) el.textContent = m; el.classList.add("visible"); }
  function he(id) { var el = document.getElementById(id); if (el) el.classList.remove("visible"); }

  function v1() {
    var ok = true;
    if (!gR("sector")) { se("sectorError"); ok = false; } else he("sectorError");
    ["revenue", "years", "employees"].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el.value) { se(id + "Error"); el.classList.add("error"); ok = false; }
      else { he(id + "Error"); el.classList.remove("error"); }
    });
    return ok;
  }

  function v2() {
    var ok = true;
    ["litigation", "faa", "workforce", "wageIssues", "concentration", "revenueType", "realEstate", "ownerDep"].forEach(function (name) {
      if (!gR(name)) { se(name + "Error"); ok = false; } else he(name + "Error");
    });
    var eo = document.getElementById("earnout");
    if (!eo.value) { se("earnoutError"); eo.classList.add("error"); ok = false; }
    else { he("earnoutError"); eo.classList.remove("error"); }
    return ok;
  }

  function v3() {
    var ok = true;
    ["firstName", "lastName", "companyName"].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el.value.trim()) { se(id + "Error"); el.classList.add("error"); ok = false; }
      else { he(id + "Error"); el.classList.remove("error"); }
    });
    var em = document.getElementById("email"), ev = em.value.trim();
    if (!ev || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ev)) {
      se("emailError", "Please enter a valid email address."); em.classList.add("error"); ok = false;
    } else { he("emailError"); em.classList.remove("error"); }
    if (!emailVerified) { se("emailError", "Please verify your email before continuing."); ok = false; }
    return ok;
  }

  /* ═══════════════════════════════════════════════════
     EVENT BINDINGS
     ═══════════════════════════════════════════════════ */
  function bindEvents() {
    document.addEventListener("change", function (e) {
      if (e.target.type === "radio") {
        var errId = e.target.name + "Error";
        if (document.getElementById(errId)) he(errId);
      }
      var selMap = { "revenue": "revenueError", "years": "yearsError", "employees": "employeesError", "earnout": "earnoutError" };
      if (selMap[e.target.id]) { he(selMap[e.target.id]); e.target.classList.remove("error"); }
    });
    document.addEventListener("input", function (e) {
      var m = { "firstName": "firstNameError", "lastName": "lastNameError", "companyName": "companyNameError", "email": "emailError" };
      if (m[e.target.id]) { he(m[e.target.id]); e.target.classList.remove("error"); }
      /* Verify code input */
      if (e.target.id === "verifyCode") {
        var c = e.target.value.replace(/\D/g, ""); e.target.value = c;
        if (c.length === 6) {
          if (c === generatedCode) {
            emailVerified = true; he("codeError"); he("emailError");
            var st = document.getElementById("emailStatus");
            st.className = "bsb-email-status verified";
            st.innerHTML = '<span class="bsb-check">✓</span> Email verified';
            document.getElementById("codeField").style.display = "none";
            document.getElementById("email").disabled = true;
            document.getElementById("email").style.opacity = "0.6";
            document.getElementById("verifyBtn").style.display = "none";
          } else { emailVerified = false; se("codeError"); }
        }
      }
    });
  }

  /* ═══════════════════════════════════════════════════
     EMAIL VERIFICATION
     ═══════════════════════════════════════════════════ */
  window.bsbSendVerification = function () {
    var em = document.getElementById("email"), ev = em.value.trim();
    if (!ev || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ev)) { se("emailError"); em.classList.add("error"); return; }
    he("emailError"); em.classList.remove("error");
    generatedCode = String(Math.floor(100000 + Math.random() * 900000));
    document.getElementById("codeField").style.display = "block";
    var st = document.getElementById("emailStatus");
    st.style.display = "flex"; st.className = "bsb-email-status pending";
    st.textContent = "Code sent to " + ev + ". Check your inbox.";
    var btn = document.getElementById("verifyBtn");
    btn.disabled = true; btn.textContent = "Sent";
    setTimeout(function () { btn.disabled = false; btn.textContent = "Resend"; }, 30000);
    /*
     * PRODUCTION: Replace with actual email send via serverless function.
     * DEV: Auto-fills code for testing. REMOVE these 2 lines in prod:
     */
    console.log("DEV — Code:", generatedCode);
    document.getElementById("verifyCode").value = generatedCode;
  };

  /* ═══════════════════════════════════════════════════
     FORM SUBMISSION
     ═══════════════════════════════════════════════════ */
  window.bsbSubmitForm = function () {
    if (!v3()) return;
    var btn = document.getElementById("submitBtn");
    btn.disabled = true; btn.innerHTML = '<span class="bsb-spinner"></span> Calculating...';
    var fd = collectData();
    var val = calc(fd);
    send(fd, val);
    setTimeout(function () {
      render(fd, val); bsbGoToStep(4);
      btn.disabled = false; btn.innerHTML = 'Get Value + Terms <span class="bsb-btn-arrow">→</span>';
    }, 1200);
  };

  function collectData() {
    return {
      sector: gR("sector"), revenue: document.getElementById("revenue").value,
      years: document.getElementById("years").value, employees: document.getElementById("employees").value,
      litigation: gR("litigation"), faa: gR("faa"), workforce: gR("workforce"),
      wageIssues: gR("wageIssues"), concentration: gR("concentration"),
      revenueType: gR("revenueType"), realEstate: gR("realEstate"),
      ownerDep: gR("ownerDep"), earnout: document.getElementById("earnout").value,
      firstName: document.getElementById("firstName").value.trim(),
      lastName: document.getElementById("lastName").value.trim(),
      company: document.getElementById("companyName").value.trim(),
      email: document.getElementById("email").value.trim(),
      phone: document.getElementById("phone").value.trim()
    };
  }

  /* ═══════════════════════════════════════════════════
     VALUATION ENGINE
     
     All adjustments multiply together against the base.
     A "clean" business with all premiums can exceed 130%
     of base. A risky one can drop to ~50%.
     
     To tune: change the decimal values below.
     Each one is labeled with its percentage impact.
     ═══════════════════════════════════════════════════ */
  function calc(fd) {
    var s = SD[fd.sector], rev = RM[fd.revenue];
    var adj = [];

    // Tenure
    var tm = 1.0;
    if      (fd.years === "20_plus") { tm = 1.15; adj.push({ l: "20+ year track record",        v: "+15%", c: "positive" }); }
    else if (fd.years === "10_20")   { tm = 1.08; adj.push({ l: "10+ year track record",        v: "+8%",  c: "positive" }); }
    else if (fd.years === "1_5")     { tm = 0.88; adj.push({ l: "Early-stage (< 5 yrs)",        v: "-12%", c: "negative" }); }
    else                             {            adj.push({ l: "Operating history",             v: "Neutral", c: "neutral" }); }

    // Size
    var sm = 1.0;
    if (fd.revenue === "20_30" || fd.revenue === "30_plus") sm = 1.05;
    else if (fd.revenue === "1_3") sm = 0.92;

    // Litigation                                                  /* ADJUSTMENT: -18% for active */
    var litMod = 1.0;
    if      (fd.litigation === "active") { litMod = 0.82; adj.push({ l: "Active litigation",           v: "-18%", c: "negative" }); }
    else if (fd.litigation === "minor")  { litMod = 0.95; adj.push({ l: "Minor/resolved litigation",   v: "-5%",  c: "negative" }); }
    else                                 {                adj.push({ l: "No litigation",                v: "No discount", c: "positive" }); }

    // FAA                                                          /* ADJUSTMENT: -22% for open issues */
    var faaMod = 1.0;
    if      (fd.faa === "issues") { faaMod = 0.78; adj.push({ l: "Open FAA compliance issues",  v: "-22%", c: "negative" }); }
    else if (fd.faa === "minor")  { faaMod = 0.93; adj.push({ l: "Minor FAA findings",          v: "-7%",  c: "negative" }); }
    else                          {                adj.push({ l: "Clean FAA record",             v: "No discount", c: "positive" }); }

    // Workforce                                                    /* ADJUSTMENT: -10% for contractor-heavy */
    var wfMod = 1.0;
    if      (fd.workforce === "contractors") { wfMod = 0.90; adj.push({ l: "Contractor-heavy workforce",  v: "-10%", c: "negative" }); }
    else if (fd.workforce === "mixed")       { wfMod = 0.96; adj.push({ l: "Mixed workforce",             v: "-4%",  c: "negative" }); }
    else                                     {               adj.push({ l: "W-2 workforce",               v: "No discount", c: "positive" }); }

    // Wage issues                                                  /* ADJUSTMENT: -12% for active */
    var wageMod = 1.0;
    if      (fd.wageIssues === "active")   { wageMod = 0.88; adj.push({ l: "Active labor disputes",       v: "-12%", c: "negative" }); }
    else if (fd.wageIssues === "resolved") { wageMod = 0.97; adj.push({ l: "Resolved labor issues",       v: "-3%",  c: "negative" }); }
    else                                   {                 adj.push({ l: "No labor issues",              v: "No discount", c: "positive" }); }

    // Customer concentration                                       /* ADJUSTMENT: -20% for 50%+ */
    var ccMod = 1.0;
    if      (fd.concentration === "heavy") { ccMod = 0.80; adj.push({ l: "Heavy concentration (50%+)",     v: "-20%", c: "negative" }); }
    else if (fd.concentration === "some")  { ccMod = 0.90; adj.push({ l: "Moderate concentration",         v: "-10%", c: "negative" }); }
    else                                   {               adj.push({ l: "Diversified customer base",      v: "No discount", c: "positive" }); }

    // Revenue type                                                 /* ADJUSTMENT: +10% contract, -10% transactional */
    var rtMod = 1.0;
    if      (fd.revenueType === "contract")      { rtMod = 1.10; adj.push({ l: "Contracted/recurring revenue", v: "+10%", c: "positive" }); }
    else if (fd.revenueType === "transactional") { rtMod = 0.90; adj.push({ l: "Transactional revenue",        v: "-10%", c: "negative" }); }
    else                                         {               adj.push({ l: "Revenue mix",                  v: "Neutral", c: "neutral" }); }

    // Real estate                                                  /* ADJUSTMENT: +8% owned, -8% short lease */
    var reMod = 1.0;
    if      (fd.realEstate === "own")         { reMod = 1.08; adj.push({ l: "Owned facility",              v: "+8%", c: "positive" }); }
    else if (fd.realEstate === "lease_short") { reMod = 0.92; adj.push({ l: "Short-term lease (< 5 yrs)",  v: "-8%", c: "negative" }); }
    else                                     {               adj.push({ l: "Long-term lease",              v: "Neutral", c: "neutral" }); }

    // Owner dependency                                             /* ADJUSTMENT: -18% for high dependency */
    var odMod = 1.0;
    if      (fd.ownerDep === "high")     { odMod = 0.82; adj.push({ l: "High owner dependency",         v: "-18%", c: "negative" }); }
    else if (fd.ownerDep === "moderate") { odMod = 0.94; adj.push({ l: "Moderate owner involvement",    v: "-6%",  c: "negative" }); }
    else                                {               adj.push({ l: "Business runs independently",   v: "No discount", c: "positive" }); }

    // Earnout                                                      /* ADJUSTMENT: +8% for 3+ yrs, -12% for <6mo */
    var eoMod = 1.0;
    if      (fd.earnout === "36_plus") { eoMod = 1.08; adj.push({ l: "3+ year earnout willingness",  v: "+8%",  c: "positive" }); }
    else if (fd.earnout === "24_36")   { eoMod = 1.04; adj.push({ l: "2-3 year earnout",             v: "+4%",  c: "positive" }); }
    else if (fd.earnout === "0_6")     { eoMod = 0.88; adj.push({ l: "Quick exit (< 6 months)",      v: "-12%", c: "negative" }); }
    else                               {              adj.push({ l: "Transition timeline",           v: "Neutral", c: "neutral" }); }

    var totalMod = tm * sm * litMod * faaMod * wfMod * wageMod * ccMod * rtMod * reMod * odMod * eoMod;
    var lo = Math.round(rev * s.lm * totalMod * 2) / 2;
    var hi = Math.round(rev * s.hm * totalMod * 2) / 2;
    if (lo < 0.5) lo = 0.5;
    if (hi - lo < 0.5) hi = lo + 1;

    return { lo: lo, hi: hi, el: s.el, eh: s.eh, sl: s.l, adjustments: adj, totalMod: totalMod };
  }

  function fmt(m) { return m >= 1 ? "$" + m.toFixed(1).replace(/\.0$/, "") + "M" : "$" + Math.round(m * 1000) + "K"; }

  function render(fd, v) {
    document.getElementById("resultRange").textContent = fmt(v.lo) + " – " + fmt(v.hi);
    document.getElementById("resultMultiple").textContent =
      "Based on " + v.el + "x – " + v.eh + "x EBITDA for " + v.sl + ", adjusted for risk factors";
    document.getElementById("resultDetails").innerHTML =
      di("Sector", v.sl) + di("Revenue", RL[fd.revenue]) + di("History", YL[fd.years]) + di("Team", EL[fd.employees]);
    var h = '<div class="bsb-adj-title">Valuation Adjustments</div>';
    v.adjustments.forEach(function (a) {
      h += '<div class="bsb-adj-item"><span class="bsb-adj-label">' + a.l + '</span><span class="bsb-adj-value ' + a.c + '">' + a.v + '</span></div>';
    });
    document.getElementById("adjustments").innerHTML = h;
  }

  function di(l, v) { return '<div class="bsb-detail-item"><div class="bsb-detail-label">' + l + '</div><div class="bsb-detail-value">' + v + '</div></div>'; }

  /* ═══════════════════════════════════════════════════
     WEBHOOK
     ═══════════════════════════════════════════════════ */
  function send(fd, v) {
    var p = {
      contact: { firstName: fd.firstName, lastName: fd.lastName, email: fd.email, phone: fd.phone, company: fd.company },
      business: {
        sector: fd.sector, sectorLabel: SD[fd.sector].l,
        revenue: fd.revenue, revenueLabel: RL[fd.revenue],
        yearsOperating: fd.years, employees: fd.employees,
        litigation: fd.litigation, faaCompliance: fd.faa,
        workforce: fd.workforce, wageIssues: fd.wageIssues,
        customerConcentration: fd.concentration,
        revenueType: fd.revenueType, realEstate: fd.realEstate,
        ownerDependency: fd.ownerDep, earnoutWillingness: fd.earnout
      },
      valuation: {
        lowEV: v.lo, highEV: v.hi,
        rangeFormatted: fmt(v.lo) + " – " + fmt(v.hi),
        ebitdaMultipleRange: v.el + "x – " + v.eh + "x",
        totalModifier: Math.round(v.totalMod * 100) + "%"
      },
      meta: { submittedAt: new Date().toISOString(), source: window.location.href, formVersion: "3.0" }
    };
    if (WEBHOOK_URL) {
      fetch(WEBHOOK_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p), mode: "no-cors" })
        .catch(function (e) { console.error("Webhook:", e); });
    }
    console.log("BSB Submission:", JSON.stringify(p, null, 2));
  }

})();
