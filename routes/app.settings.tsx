
import {
  Box,
  Card,
  Layout,
  Link,
  List,
  Page,
  Text,
  BlockStack,
  TextField,
  Button,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { useState } from "react";
import { ActionFunctionArgs, json } from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shopSession = await db.session.findUnique({
    where: {
      id: session.id,
    },
  });
  return json(shopSession);
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const akeneoUrl = formData.get("akeneoUrl") as string;
  const akeneoClientId = formData.get("akeneoClientId") as string;
  const akeneoClientSecret = formData.get("akeneoClientSecret") as string;
  const akeneoUsername = formData.get("akeneoUsername") as string;
  const akeneoPassword = formData.get("akeneoPassword") as string;

  await db.session.update({
    where: {
      id: session.id,
    },
    data: {
      akeneoUrl,
      akeneoClientId,
      akeneoClientSecret,
      akeneoUsername,
      akeneoPassword,
    },
  });

  return json({ message: "Settings saved!" });
};

export default function SettingsPage() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  const [akeneoUrl, setAkeneoUrl] = useState(loaderData?.akeneoUrl || "");
  const [clientId, setClientId] = useState(loaderData?.akeneoClientId || "");
  const [clientSecret, setClientSecret] = useState(
    loaderData?.akeneoClientSecret || ""
  );
  const [username, setUsername] = useState(loaderData?.akeneoUsername || "");
  const [password, setPassword] = useState(loaderData?.akeneoPassword || "");

  return (
    <Page backAction={{ content: "Home", url: "/app" }}>
      <TitleBar title="Akeneo Settings" />
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">
                Akeneo Credentials
              </Text>
              {actionData?.message && <p>{actionData.message}</p>}
              <Form method="post">
                <BlockStack gap="300">
                  <TextField
                    label="Akeneo URL"
                    name="akeneoUrl"
                    value={akeneoUrl}
                    onChange={setAkeneoUrl}
                    autoComplete="off"
                  />
                  <TextField
                    label="Client ID"
                    name="akeneoClientId"
                    value={clientId}
                    onChange={setClientId}
                    autoComplete="off"
                  />
                  <TextField
                    label="Client Secret"
                    name="akeneoClientSecret"
                    value={clientSecret}
                    onChange={setClientSecret}
                    autoComplete="off"
                    type="password"
                  />
                  <TextField
                    label="Username"
                    name="akeneoUsername"
                    value={username}
                    onChange={setUsername}
                    autoComplete="off"
                  />
                  <TextField
                    label="Password"
                    name="akeneoPassword"
                    value={password}
                    onChange={setPassword}
                    autoComplete="off"
                    type="password"
                  />
                  <Button submit variant="primary">
                    Save
                  </Button>
                </BlockStack>
              </Form>
            </BlockStack>
          </Card>
        </Layout.Section>
        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">
                Sync Settings
              </Text>
              <TextField
                label="Sync Interval (hours)"
                value="2"
                disabled
                autoComplete="off"
              />
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
