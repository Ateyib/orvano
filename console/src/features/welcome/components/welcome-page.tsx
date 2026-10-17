import { Trans } from "@lingui/react/macro";

// A placeholder until the console shell (feature 11) and sign in (feature 13) replace it.
export function WelcomePage() {
  return (
    <main>
      <h1>
        <Trans>Orvano console</Trans>
      </h1>
      <p>
        <Trans>The server and console are running. Screens arrive with the next features.</Trans>
      </p>
    </main>
  );
}
