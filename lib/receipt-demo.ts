/**
 * Demo Ed25519 keypair for the Agent Disaster Lab.
 *
 * DEMO ONLY — this keypair is intentionally public so the disaster lab
 * works out-of-the-box without any environment setup. It signs scenario
 * receipts so visitors can witness live cryptographic verification.
 *
 * Do NOT use these keys to protect real data.
 */

export const DEMO_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEIG8fqd9zBh+bHmHo+xTMPF87tIFFA0ee2kXSH05w20gg
-----END PRIVATE KEY-----
`

export const DEMO_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAt6n6ggWoLx0Cxf45381E96uif4SIPjwCzLiuJ4ojDvk=
-----END PUBLIC KEY-----
`
