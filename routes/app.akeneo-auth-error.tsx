import { Page, Card, Button } from "@shopify/polaris";
import { useNavigate } from "@remix-run/react";

export default function AkeneoAuthError() {
  const navigate = useNavigate();

  return (
    <Page title="Akeneo Authentication Error">
      <Card>
        <div style={{ padding: "2rem" }}>
          <h1>Akeneo credentials are not valid.</h1>
          <p>Please check your Akeneo credentials in the settings.</p>
          <br />
          <Button onClick={() => navigate("/app/settings")}>Go to Settings</Button>
        </div>
      </Card>
    </Page>
  );
}
