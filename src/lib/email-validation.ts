/**
 * Email validation utility - blocks disposable/temporary email domains
 * to prevent free trial abuse.
 */

const DISPOSABLE_DOMAINS = new Set([
  // Popular disposable email providers
  "mailinator.com",
  "guerrillamail.com",
  "guerrillamail.net",
  "guerrillamail.org",
  "guerrillamailblock.com",
  "tempmail.com",
  "temp-mail.org",
  "temp-mail.io",
  "throwaway.email",
  "throwaway.com",
  "yopmail.com",
  "yopmail.fr",
  "sharklasers.com",
  "guerrillamail.info",
  "grr.la",
  "mailnesia.com",
  "maildrop.cc",
  "dispostable.com",
  "trashmail.com",
  "trashmail.net",
  "trashmail.org",
  "fakeinbox.com",
  "tempail.com",
  "tempr.email",
  "discard.email",
  "discardmail.com",
  "discardmail.de",
  "mailcatch.com",
  "mytemp.email",
  "tempmailaddress.com",
  "tmpmail.org",
  "tmpmail.net",
  "mohmal.com",
  "getnada.com",
  "10minutemail.com",
  "10minutemail.net",
  "minutemail.com",
  "emailondeck.com",
  "guerrillamail.de",
  "harakirimail.com",
  "mailforspam.com",
  "spamgourmet.com",
  "jetable.org",
  "getairmail.com",
  "meltmail.com",
  "spambox.us",
  "crazymailing.com",
  "mailnull.com",
  "bugmenot.com",
  "safetymail.info",
  "inboxbear.com",
  "mailsac.com",
  "mailslurp.com",
  "disposableemailaddress.com",
  "emkei.cz",
  "burnermail.io",
  "burpcollaborator.net",
]);

/**
 * Check if an email address uses a disposable/temporary domain.
 * Returns `true` if the email is valid (not disposable).
 */
export function isEmailAllowed(email: string): boolean {
  if (!email || !email.includes("@")) return false;
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return false;
  return !DISPOSABLE_DOMAINS.has(domain);
}

/**
 * Get the domain of an email address.
 */
export function getEmailDomain(email: string): string {
  return email.split("@")[1]?.toLowerCase() || "";
}
