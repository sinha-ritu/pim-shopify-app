import type { LoaderFunctionArgs } from "@remix-run/node";
import {
  Page,
  Layout,
  Text,
  Card,
  BlockStack,
  Link,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  return null;
};

export default function Index() {
  return (
    <Page>
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="200">
                <Text as="h2" variant="headingMd">
                  Akeneo Integration
                </Text>
                <Text variant="bodyMd" as="p">
                  <Link url="/app/akeneo-attributes" external={false}>
                    View Akeneo Attributes
                  </Link>
                </Text>
                <Text variant="bodyMd" as="p">
                  <Link url="/app/akeneo-product-families" external={false}>
                    View Akeneo Families
                  </Link>
                </Text>
                <Text variant="bodyMd" as="p">
                  <Link url="/app/akeneo-products" external={false}>
                    View Akeneo Products
                  </Link>
                </Text>
                <Text variant="bodyMd" as="p">
                  <Link url="/app/akeneo-categories" external={false}>
                    View Akeneo Categories
                  </Link>
                </Text>
                <Text variant="bodyMd" as="p">
                  <Link url="/app/settings" external={false}>
                    Akeneo Settings
                  </Link>
                </Text>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
