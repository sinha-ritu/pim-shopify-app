import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { Link, useFetcher, useLoaderData } from "@remix-run/react";
import {
  Page,
  Card,
  BlockStack,
  List,
  ButtonGroup,
  Button,
  Text,
} from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";
import { useEffect } from "react";
import { akeneoClient } from "../akeneo.server";
import { authenticate } from "../shopify.server";

const mapAkeneoToShopifyType = (akeneoType: string): string => {
  switch (akeneoType) {
    case "pim_catalog_text":
      return "single_line_text_field";
    case "pim_catalog_textarea":
      return "multi_line_text_field";
    case "pim_catalog_number":
      return "number_integer";
    case "pim_catalog_boolean":
      return "boolean";
    case "pim_catalog_date":
      return "date";
    default:
      return "single_line_text_field";
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const attributeCode = formData.get("attributeCode") as string;
  const attributeType = formData.get("attributeType") as string;
  const attributeLabel = formData.get("attributeLabel") as string;

  if (!attributeCode || !attributeType || !attributeLabel) {
    return json({ error: "Missing mandatory information" }, { status: 400 });
  }

  const { admin } = await authenticate.admin(request);

  const shopifyType = mapAkeneoToShopifyType(attributeType);

  const response = await admin.graphql(
      `#graphql
    mutation CreateMetafieldDefinition($definition: MetafieldDefinitionInput!) {
      metafieldDefinitionCreate(definition: $definition) {
        createdDefinition {
          id
        }
        userErrors {
          field
          message
          code
        }
      }
    }`,
    {
      variables: {
        definition: {
          name: attributeLabel,
          namespace: "akeneo",
          key: attributeCode,
          type: shopifyType,
          ownerType: "PRODUCT",
        },
      },
    }
  );

  const responseJson = await response.json();
  const errors = responseJson.data?.metafieldDefinitionCreate?.userErrors;

  if (errors && errors.length > 0) {
    return json({ error: errors[0].message }, { status: 400 });
  }

  return json({ success: true });
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const limit = 10;

  try {
    const attributes = await akeneoClient.attribute.get({
      query: { page: page, limit: limit },
    });
    return json({ attributes, page });
  } catch (error) {
    console.error('Failed to connect to Akeneo:', error);
    throw new Response("Failed to connect to Akeneo", { status: 500 });
  }
};

export default function AkeneoAttributes() {
  const { attributes, page } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();

  useEffect(() => {
    if (fetcher.data) {
      if (fetcher.data.success) {
        shopify.toast.show("Attribute created successfully in Shopify");
      } else if (fetcher.data.error) {
        shopify.toast.show(fetcher.data.error, { isError: true });
      }
    }
  }, [fetcher.data, shopify]);

  // @ts-ignore
  const hasNextPage = attributes._links?.next?.href ? true : false;
  // @ts-ignore
  const hasPreviousPage = attributes._links?.previous?.href ? true : false;

  return (
    <Page
      title="Akeneo Attributes"
      backAction={{ content: "Home", url: "/app" }}
    >
      <BlockStack gap="500">
        <Card>
          <List>
            {attributes.items.map((attribute: any) => (
              <List.Item key={attribute.code}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <Text as="p">{attribute.code} - {attribute.type}</Text>
                  <fetcher.Form method="post">
                    <input type="hidden" name="attributeCode" value={attribute.code} />
                    <input type="hidden" name="attributeType" value={attribute.type} />
                    <input type="hidden" name="attributeLabel" value={attribute.labels?.en_US || attribute.code} />
                    <Button submit loading={fetcher.state === "submitting"}>
                      Create in Shopify
                    </Button>
                  </fetcher.Form>
                </div>
              </List.Item>
            ))}
          </List>
        </Card>
        <ButtonGroup>
          {hasPreviousPage && (
            <Link to={`?page=${page - 1}`}>
              <Button>Previous</Button>
            </Link>
          )}
          {hasNextPage && (
            <Link to={`?page=${page + 1}`}>
              <Button>Next</Button>
            </Link>
          )}
        </ButtonGroup>
      </BlockStack>
    </Page>
  );
}
