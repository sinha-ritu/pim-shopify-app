import {
  json,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/node";
import {
  Link,
  useFetcher,
  useLoaderData,
  useNavigate,
  useSubmit,
} from "@remix-run/react";
import {
  Page,
  Card,
  BlockStack,
  ButtonGroup,
  Button,
  ResourceList,
} from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";
import { useEffect, useState } from "react";
import { getAkeneoClient } from "../akeneo.server";
import { authenticate } from "../shopify.server";
import { AttributeListItem } from "../components/AttributeListItem.tsx";
import { EmptyStateComponent } from "../components/EmptyState.tsx";
import type { Attribute } from "../models/attribute.server.ts";

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

const createMetafieldDefinitionInShopify = async (
  admin: any,
  attribute: Attribute
) => {
  const shopifyType = mapAkeneoToShopifyType(attribute.type);
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
          name: attribute.labels?.en_US || attribute.code,
          namespace: "akeneo",
          key: attribute.code,
          type: shopifyType,
          ownerType: "PRODUCT",
        },
      },
    }
  );

  const responseJson = await response.json();
  const errors = responseJson.data?.metafieldDefinitionCreate?.userErrors;

  if (errors && errors.length > 0) {
    return { error: errors[0].message };
  }

  return { success: true };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const actionType = formData.get("actionType");
  const { admin } = await authenticate.admin(request);

  if (actionType === "bulk") {
    const attributesData = formData.getAll("attributes[]");
    if (attributesData.length === 0) {
      return json({ error: "No attributes selected" }, { status: 400 });
    }

    const attributes: Attribute[] = attributesData.map((attr) =>
      JSON.parse(attr as string)
    );
    for (const attribute of attributes) {
      const result = await createMetafieldDefinitionInShopify(admin, attribute);
      if (result.error) {
        return json({ error: result.error }, { status: 400 });
      }
    }

    return json({ success: true });
  } else {
    const attributeCode = formData.get("attributeCode") as string;
    const attributeType = formData.get("attributeType") as string;
    const attributeLabel = formData.get("attributeLabel") as string;

    if (!attributeCode || !attributeType || !attributeLabel) {
      return json({ error: "Missing mandatory information" }, { status: 400 });
    }

    const attribute: Attribute = {
      code: attributeCode,
      type: attributeType,
      labels: { en_US: attributeLabel },
      _links: {},
    };

    return json(await createMetafieldDefinitionInShopify(admin, attribute));
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

    const hasNextPage = attributes._links?.next?.href ? true : false;
    const hasPreviousPage = attributes._links?.previous?.href ? true : false;

    return json({ attributes, page, hasNextPage, hasPreviousPage });
  } catch (error: any) {
    throw new Response(error.message, { status: 500 });
  }
};

export default function AkeneoAttributes() {
  const { attributes, page, hasNextPage, hasPreviousPage } =
    useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();
  const submit = useSubmit();
  const navigate = useNavigate();
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

  const handleBulkImport = () => {
    const formData = new FormData();
    formData.append("actionType", "bulk");
    selectedAttributes.forEach((attributeCode) => {
      const attribute = attributes.items.find(
        (attr: Attribute) => attr.code === attributeCode
      );
      if (attribute) {
        formData.append("attributes[]", JSON.stringify(attribute));
      }
    });
    submit(formData, { method: "post" });
    setSelectedAttributes([]);
  };

  if (!attributes || attributes.items.length === 0) {
    return (
      <EmptyStateComponent
        title="No attributes found"
        message="No attributes were found in your Akeneo instance."
      />
    );
  }

  return (
    <Page
      title="Akeneo Attributes"
      backAction={{ content: "Home", onAction: () => navigate("/app") }}
      primaryAction={{
        content: "Bulk Import",
        onAction: handleBulkImport,
        disabled: selectedAttributes.length === 0,
      }}
    >
      <BlockStack gap="500">
        <Card>
          <ResourceList
            resourceName={{ singular: "attribute", plural: "attributes" }}
            items={attributes.items}
            renderItem={(attribute: Attribute) => (
              <AttributeListItem attribute={attribute} />
            )}
            selectedItems={selectedAttributes}
            onSelectionChange={setSelectedAttributes}
            selectable
          />
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
