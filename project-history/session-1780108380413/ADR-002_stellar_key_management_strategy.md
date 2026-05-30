# ADR-002: Stellar Key Management Strategy

## Status
Proposed

## Context
The application needs to allow users to manage their Stellar assets, which involves private key management. Given the "traditional banking-like" user experience, users will expect a level of abstraction from key management complexities. This implies providing a custodial solution, but we also need to consider user control and security best practices for crypto assets.

## Decision
We will implement a **hybrid key management strategy**:

1.  **Custodial Wallets (Default)**: For the primary user experience, the application will securely generate and manage Stellar private keys on behalf of users.
    *   Private keys will be encrypted at rest (e.g., using KMS) and stored in secure, segregated storage.
    *   Transactions will be signed by backend services with appropriate authorization and multi-signature policies for sensitive operations (e.g., large withdrawals).
    *   Cold storage (HSMs) will be used for significant portions of user funds, with hot wallets holding only necessary operational liquidity.
2.  **Optional Non-Custodial Integration (Future)**: In a later phase, we will explore integration with external non-custodial wallets (e.g., Ledger, Trezor, Freighter) allowing users to connect their own wallets and sign transactions client-side. This offers users full control but shifts the responsibility of key security to them.

## Consequences
**Positive (Custodial Default):**
*   **Simplified User Experience**: Users don't need to manage seed phrases or private keys directly, aligning with "banking-like."
*   **Easier Recovery**: We can assist users with account recovery if they lose access.
*   **Enhanced Security Controls**: Centralized control allows us to implement advanced security measures like multi-sig, rate limits, and anomaly detection on transactions.

**Negative (Custodial Default):**
*   **Single Point of Failure**: Our system becomes a prime target for attacks; a breach could compromise all user funds.
*   **High Regulatory Burden**: Increased responsibility for security, compliance (KYC/AML), and asset custody.
*   **Not "Your Keys, Not Your Crypto"**: Users do not have absolute control over their private keys, which may deter some crypto-native users.

**Positive (Non-Custodial Option):**
*   **User Empowerment**: Provides users with full control over their assets.
*   **Reduced Liability**: Shifts key security responsibility to the user.
*   **Wider Appeal**: Caters to users who prefer self-custody.

**Negative (Non-Custodial Option):**
*   **Complex User Experience**: Users are responsible for key backups and security, which can lead to lost funds if mishandled.
*   **Limited Features**: Certain features (e.g., automated staking, internal trading engine optimization) might be harder to implement directly with external wallets.