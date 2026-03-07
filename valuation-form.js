/*
 * Black Sky Valuation Form
 *
 * Squarespace integration pattern:
 * 1) Add <div id="valuation-form-root"></div> in a Code Block.
 * 2) Load this script from jsDelivr.
 *
 * This file is intentionally self-contained so valuation tuning only requires
 * editing this repo (not Squarespace page markup).
 */
(function () {
  'use strict';

  /**
   * -----------------------------
   * EASY-TUNE CONFIGURATION ZONE
   * -----------------------------
   * All valuation logic is controlled here.
   *
   * Multiples are expressed as EBITDA multiples.
   * Adjustments are percentage deltas applied to the selected base multiple.
   * Example:
   * - Base multiple: 6.0x
   * - Combined adjustments: +10%
   * - Adjusted multiple: 6.6x
   */
  var CONFIG = {
    // Optional webhook endpoint (Google Apps Script Web App URL).
    // Leave empty string to skip submission and keep calculations client-side only.
    WEBHOOK_URL: '',

    // Baseline multiple ranges by business profile.
    BASE_MULTIPLES: {
      mro: { low: 5.0, high: 8.0 },
      manufacturing: { low: 4.0, high: 6.5 },
      distribution: { low: 4.5, high: 7.0 },
      services: { low: 3.5, high: 6.0 }
    },

    // Adjustment grid (% change to base multiple).
    // Keep these comments aligned with strategy decisions for easy team edits.
    ADJUSTMENTS: {
      growthRate: {
        // Annual growth in revenue.
        low: -0.12,      // <5% growth: -12%
        medium: 0.0,     // 5-15% growth: no change
        high: 0.14       // >15% growth: +14%
      },
      recurringRevenue: {
        // Percent of revenue that is contractual/recurring.
        low: -0.08,      // <20% recurring: -8%
        medium: 0.06,    // 20-50% recurring: +6%
        high: 0.14       // >50% recurring: +14%
      },
      customerConcentration: {
        // Revenue concentration in top customer.
        highRisk: -0.15, // >30%: -15%
        moderate: -0.05, // 15-30%: -5%
        diversified: 0.08 // <15%: +8%
      },
      ownerDependence: {
        // Operational dependence on owner/founder.
        high: -0.14,     // Business cannot run without owner: -14%
        medium: -0.05,   // Some dependence: -5%
        low: 0.06        // Leadership depth in place: +6%
      },
      marginQuality: {
        // EBITDA margin quality benchmarking.
        low: -0.10,      // <10% margin: -10%
        medium: 0.0,     // 10-20% margin: no change
        high: 0.10       // >20% margin: +10%
      }
    },

    // Clamp to prevent unrealistic outputs.
    MULTIPLE_FLOOR: 2.5,
    MULTIPLE_CEILING: 12.0
  };

  function money(n) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(n);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function parseNumber(raw) {
    if (typeof raw === 'number') return raw;
    var v = String(raw || '').replace(/[^0-9.-]/g, '');
    return Number(v || 0);
  }

  function classifyGrowth(growthPct) {
    if (growthPct < 5) return 'low';
    if (growthPct <= 15) return 'medium';
    return 'high';
  }

  function classifyRecurring(recurringPct) {
    if (recurringPct < 20) return 'low';
    if (recurringPct <= 50) return 'medium';
    return 'high';
  }

  function classifyConcentration(topCustomerPct) {
    if (topCustomerPct > 30) return 'highRisk';
    if (topCustomerPct >= 15) return 'moderate';
    return 'diversified';
  }

  function classifyMargin(ebitdaMarginPct) {
    if (ebitdaMarginPct < 10) return 'low';
    if (ebitdaMarginPct <= 20) return 'medium';
    return 'high';
  }

  function calculateValuation(input) {
    var base = CONFIG.BASE_MULTIPLES[input.businessType] || CONFIG.BASE_MULTIPLES.services;

    // Start with zero adjustment and add each factor.
    var adjustmentTotal = 0;
    var breakdown = [];

    var growthBucket = classifyGrowth(input.growthRatePct);
    var growthAdj = CONFIG.ADJUSTMENTS.growthRate[growthBucket];
    adjustmentTotal += growthAdj;
    breakdown.push(['Growth rate', growthAdj]);

    var recurringBucket = classifyRecurring(input.recurringRevenuePct);
    var recurringAdj = CONFIG.ADJUSTMENTS.recurringRevenue[recurringBucket];
    adjustmentTotal += recurringAdj;
    breakdown.push(['Recurring revenue', recurringAdj]);

    var concentrationBucket = classifyConcentration(input.topCustomerPct);
    var concentrationAdj = CONFIG.ADJUSTMENTS.customerConcentration[concentrationBucket];
    adjustmentTotal += concentrationAdj;
    breakdown.push(['Customer concentration', concentrationAdj]);

    var ownerAdj = CONFIG.ADJUSTMENTS.ownerDependence[input.ownerDependence] || 0;
    adjustmentTotal += ownerAdj;
    breakdown.push(['Owner dependence', ownerAdj]);

    var marginBucket = classifyMargin(input.ebitdaMarginPct);
    var marginAdj = CONFIG.ADJUSTMENTS.marginQuality[marginBucket];
    adjustmentTotal += marginAdj;
    breakdown.push(['Margin quality', marginAdj]);

    var adjustedLowMultiple = clamp(base.low * (1 + adjustmentTotal), CONFIG.MULTIPLE_FLOOR, CONFIG.MULTIPLE_CEILING);
    var adjustedHighMultiple = clamp(base.high * (1 + adjustmentTotal), CONFIG.MULTIPLE_FLOOR, CONFIG.MULTIPLE_CEILING);

    var lowValue = input.ebitda * adjustedLowMultiple;
    var highValue = input.ebitda * adjustedHighMultiple;

    return {
      base: base,
      adjusted: { low: adjustedLowMultiple, high: adjustedHighMultiple },
      valuation: { low: lowValue, high: highValue },
      adjustmentTotal: adjustmentTotal,
      breakdown: breakdown
    };
  }

  function render() {
    var mount = document.getElementById('valuation-form-root');
    if (!mount) return;

    mount.innerHTML = [
      '<section class="vf-card">',
      '<h2>Business Valuation Estimator</h2>',
      '<p class="vf-sub">Estimate an EBITDA multiple range with transparent adjustment factors.</p>',
      '<form id="valuation-form" class="vf-grid">',
      '<label>Business type<select name="businessType" required>',
      '<option value="mro">MRO</option>',
      '<option value="manufacturing">Manufacturing</option>',
      '<option value="distribution">Distribution</option>',
      '<option value="services">Services</option>',
      '</select></label>',
      '<label>Annual revenue ($)<input name="revenue" type="number" min="0" step="1000" required></label>',
      '<label>EBITDA ($)<input name="ebitda" type="number" min="0" step="1000" required></label>',
      '<label>3-year CAGR (%)<input name="growthRatePct" type="number" min="-100" max="300" step="0.1" required></label>',
      '<label>Recurring revenue (%)<input name="recurringRevenuePct" type="number" min="0" max="100" step="0.1" required></label>',
      '<label>Top customer concentration (%)<input name="topCustomerPct" type="number" min="0" max="100" step="0.1" required></label>',
      '<label>Owner dependence<select name="ownerDependence" required>',
      '<option value="high">High</option>',
      '<option value="medium">Medium</option>',
      '<option value="low">Low</option>',
      '</select></label>',
      '<label>Contact name<input name="contactName" type="text" required></label>',
      '<label>Email<input name="email" type="email" required></label>',
      '<button type="submit">Calculate valuation</button>',
      '</form>',
      '<div id="valuation-result" class="vf-result" aria-live="polite"></div>',
      '</section>'
    ].join('');

    var form = document.getElementById('valuation-form');
    var resultEl = document.getElementById('valuation-result');

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var fd = new FormData(form);

      var revenue = parseNumber(fd.get('revenue'));
      var ebitda = parseNumber(fd.get('ebitda'));
      var ebitdaMarginPct = revenue > 0 ? (ebitda / revenue) * 100 : 0;

      var payload = {
        businessType: String(fd.get('businessType') || ''),
        revenue: revenue,
        ebitda: ebitda,
        growthRatePct: parseNumber(fd.get('growthRatePct')),
        recurringRevenuePct: parseNumber(fd.get('recurringRevenuePct')),
        topCustomerPct: parseNumber(fd.get('topCustomerPct')),
        ownerDependence: String(fd.get('ownerDependence') || ''),
        ebitdaMarginPct: ebitdaMarginPct,
        contactName: String(fd.get('contactName') || ''),
        email: String(fd.get('email') || '')
      };

      var output = calculateValuation(payload);

      var rows = output.breakdown.map(function (item) {
        var pct = (item[1] * 100).toFixed(1);
        var sign = item[1] > 0 ? '+' : '';
        return '<li><span>' + item[0] + '</span><strong>' + sign + pct + '%</strong></li>';
      }).join('');

      resultEl.innerHTML = [
        '<h3>Estimated valuation range</h3>',
        '<p class="vf-range">' + money(output.valuation.low) + ' – ' + money(output.valuation.high) + '</p>',
        '<p>Adjusted EBITDA multiple: <strong>' + output.adjusted.low.toFixed(2) + 'x – ' + output.adjusted.high.toFixed(2) + 'x</strong></p>',
        '<details><summary>Adjustment breakdown</summary><ul class="vf-breakdown">' + rows + '</ul></details>'
      ].join('');

      if (CONFIG.WEBHOOK_URL) {
        fetch(CONFIG.WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...payload,
            valuationLow: output.valuation.low,
            valuationHigh: output.valuation.high,
            multipleLow: output.adjusted.low,
            multipleHigh: output.adjusted.high,
            submittedAt: new Date().toISOString()
          })
        }).catch(function () {
          // Silent fail; calculation already shown to user.
        });
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
