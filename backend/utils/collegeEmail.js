// Only emails from approved college domains may sign up.
// Configure in .env:  ALLOWED_EMAIL_DOMAINS=mycollege.edu.in,student.mycollege.edu.in
// A domain also allows its sub-domains (cs.mycollege.edu.in matches mycollege.edu.in).

const allowedDomains = () =>
  (process.env.ALLOWED_EMAIL_DOMAINS || '')
    .split(',')
    .map((d) => d.trim().toLowerCase().replace(/^@/, ''))
    .filter(Boolean);

exports.allowedDomains = allowedDomains;

exports.isCollegeEmail = (email) => {
  const domains = allowedDomains();
  if (domains.length === 0) return false;           // not configured -> nobody can sign up
  const at = String(email).lastIndexOf('@');
  if (at < 1) return false;
  const domain = String(email).slice(at + 1).toLowerCase();
  return domains.some((d) => domain === d || domain.endsWith('.' + d));
};