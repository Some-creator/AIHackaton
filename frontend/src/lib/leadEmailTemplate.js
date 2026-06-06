function formatWebsiteUrl(website) {
  if (!website?.trim()) return '';
  const trimmed = website.trim();
  return trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
}

function formatWebsiteLabel(website) {
  if (!website?.trim()) return '';
  return website.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
}

function buildIntroSection(leadName, business, analysis) {
  const name = business?.name?.trim() || 'Our business';
  const websiteLabel = formatWebsiteLabel(business?.website);
  const location = business?.location?.trim();
  const services = Array.isArray(business?.services) && business.services.length
    ? business.services.slice(0, 4).join(', ')
    : 'our core services';
  const targetMarket = business?.targetMarket?.trim();
  const strength = analysis?.strengths?.[0]?.trim();

  const lines = [`Hi ${leadName} team,`, ''];

  let intro = `I'm reaching out from ${name}`;
  if (websiteLabel) {
    intro += ` — you can learn more about us at ${websiteLabel}`;
  }
  intro += '.';

  lines.push(intro);

  let about = `We are`;
  if (location) about += ` a ${location}-based business`;
  else about += ' a local business';
  about += ` offering ${services.toLowerCase()}`;
  if (targetMarket) {
    about += ` for ${targetMarket.toLowerCase()}`;
  }
  about += '.';

  lines.push(about);

  if (strength) {
    lines.push(strength.endsWith('.') ? strength : `${strength}.`);
  }

  return lines.join('\n');
}

function buildPartnershipSection(lead, business, marketGap) {
  const leadName = lead.name;
  const businessName = business?.name?.trim() || 'our business';
  const services = Array.isArray(business?.services) && business.services.length
    ? business.services.slice(0, 3).join(', ')
    : 'what we offer';
  const gapNiche = marketGap?.niche?.trim();
  const opportunity = marketGap?.opportunity?.trim();

  const lines = [''];

  lines.push(`I came across ${leadName} while looking for local businesses we could partner with, and I think there is a strong fit.`);

  if (lead.hook?.trim()) {
    lines.push('');
    lines.push(lead.hook.trim().endsWith('.') ? lead.hook.trim() : `${lead.hook.trim()}.`);
  }

  lines.push('');
  lines.push(`Here is how I think we could work together:`);

  if (gapNiche) {
    lines.push(
      `We help businesses like yours with ${gapNiche.charAt(0).toLowerCase()}${gapNiche.slice(1)}. Through ${services.toLowerCase()}, ${businessName} can support ${leadName} with solutions tailored to your needs.`,
    );
  } else {
    lines.push(
      `Through ${services.toLowerCase()}, ${businessName} can support ${leadName} with solutions tailored to what you do day to day.`,
    );
  }

  if (opportunity) {
    lines.push('');
    lines.push(opportunity.endsWith('.') ? opportunity : `${opportunity}.`);
  }

  return lines.join('\n');
}

function buildSignOff(business) {
  const name = business?.name?.trim() || 'Our team';
  const website = formatWebsiteUrl(business?.website);
  const lines = ['', 'Would you be open to a brief call this week to explore a partnership?', '', 'Best regards,', name];

  if (website) {
    lines.push(website);
  }

  return lines.join('\n');
}

export function buildLeadEmailTemplate({ lead, business, analysis, marketGap }) {
  const businessName = business?.name?.trim() || 'Our business';
  const leadName = lead.name;

  const subject = `Introduction from ${businessName} — partnership with ${leadName}`;

  const body = [
    buildIntroSection(leadName, business, analysis),
    buildPartnershipSection(lead, business, marketGap),
    buildSignOff(business),
  ].join('\n');

  return { subject, body };
}

export function buildMailtoLink(email, subject, body) {
  if (!email) return null;
  const params = new URLSearchParams({
    subject,
    body,
  });
  return `mailto:${email}?${params.toString()}`;
}
