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
import { getAkeneoClient } from "../akeneo.server";
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
  const actionType = formData.get("actionType");

  if (actionType === "bulk") {
    const attributes = formData.getAll("attributes[]").map((attr) => JSON.parse(attr as string));
    const { admin } = await authenticate.admin(request);

    for (const attribute of attributes) {
      const shopifyType = mapAkeneoToShopifyType(attribute.type);
      await admin.graphql(
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
              name: attribute.labels?.en_US || attribute.code,
              namespace: "akeneo",
              key: attribute.code,
              type: shopifyType,
              ownerType: "PRODUCT",
            },
          },
        }
      );
    }

    return json({ success: true });
  } else {
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
  }
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const limit = 10;

  try {
    const akeneoClient = await getAkeneoClient(request);
    const attributes = await akeneoClient.attribute.get({
      query: { page: page, limit: limit },
    });
    return json({ attributes, page });
  } catch (error) {
    console.error('Failed to connect to Akeneo:', error);
    throw new Response("Failed to connect to Akeneo", { status: 500 });
  }
};

import { Checkbox } from "@shopify/polaris";
import { useState } from "react";

export default function AkeneoAttributes() {
  const { attributes, page } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();
  const [selectedAttributes, setSelectedAttributes] = useState<string[]>([]);

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

  const handleBulkImport = () => {
    const formData = new FormData();
    formData.append("actionType", "bulk");
    selectedAttributes.forEach((attributeCode) => {
      const attribute = attributes.items.find((attr: any) => attr.code === attributeCode);
      if (attribute) {
        formData.append("attributes[]", JSON.stringify(attribute));
      }
    });
    fetcher.submit(formData, { method: "post" });
  };

  return (
    <Page
      title="Akeneo Attributes"
      backAction={{ content: "Home", url: "/app" }}
      primaryAction={{
        content: "Bulk Import",
        onAction: handleBulkImport,
        disabled: selectedAttributes.length === 0,
      }}
    >
      <BlockStack gap="500">
        <Card>
          <BlockStack>
            {attributes.items.map((attribute: any) => (
              <div key={attribute.code} style={{ paddingBlock: 'var(--p-space-200)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <Checkbox
                    label={`${attribute.code} - ${attribute.type}`}
                    checked={selectedAttributes.includes(attribute.code)}
                    onChange={(checked) => {
                      if (checked) {
                        setSelectedAttributes([...selectedAttributes, attribute.code]);
                      } else {
                        setSelectedAttributes(
                          selectedAttributes.filter((code) => code !== attribute.code)
                        );
                      }
                    }}
                  />
                  <fetcher.Form method="post">
                    <input type="hidden" name="attributeCode" value={attribute.code} />
                    <input type="hidden" name="attributeType" value={attribute.type} />
                    <input type="hidden" name="attributeLabel" value={attribute.labels?.en_US || attribute.code} />
                    <Button submit loading={fetcher.state === "submitting"}>
                      Create in Shopify
                    </Button>
                  </fetcher.Form>
                </div>
              </div>
            ))}
          </BlockStack>
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
