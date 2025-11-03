import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import {
  Page,
  Card,
  BlockStack,
  List,
  ButtonGroup,
  Button,
  Text,
} from "@shopify/polaris";
import { getAkeneoClient } from "../akeneo.server";
import { authenticate } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const actionType = formData.get("actionType");

  if (actionType === "bulk") {
    const families = formData.getAll("families[]").map((fam) => JSON.parse(fam as string));
    const { admin } = await authenticate.admin(request);

    for (const family of families) {
      await admin.graphql(
        `#graphql
          mutation CreateProductType($name: String!) {
            productTypeCreate(name: $name) {
              productType {
                id
                name
              }
              userErrors {
                field
                message
              }
            }
          }`,
        {
          variables: {
            name: family.code,
          },
        }
      );
    }

    return json({ success: true });
  } else {
    // Handle single family import if needed in the future
    return json({ error: "Single family import not implemented yet" }, { status: 400 });
  }
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const limit = 10;

  try {
    const akeneoClient = await getAkeneoClient(request);
    const productFamilies = await akeneoClient.family.get({
      query: {page: page, limit: limit}
    });
    return json({ productFamilies, page });
  } catch (error) {
    console.error('Failed to connect to Akeneo:', error);
    throw new Response("Failed to connect to Akeneo", { status: 500 });
  }
};

import { Checkbox } from "@shopify/polaris";
import { useState } from "react";
import { useFetcher } from "@remix-run/react";

export default function AkeneoProductFamilies() {
  const { productFamilies, page } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const [selectedFamilies, setSelectedFamilies] = useState<string[]>([]);

  // @ts-ignore
  const hasNextPage = productFamilies._links?.next?.href ? true : false;
  // @ts-ignore
  const hasPreviousPage = productFamilies._links?.previous?.href ? true : false;

  const handleBulkImport = () => {
    const formData = new FormData();
    formData.append("actionType", "bulk");
    selectedFamilies.forEach((familyCode) => {
      const family = productFamilies.items.find((fam: any) => fam.code === familyCode);
      if (family) {
        formData.append("families[]", JSON.stringify(family));
      }
    });
    fetcher.submit(formData, { method: "post" });
  };

  return (
    <Page
      title="Akeneo Product Families"
      backAction={{ content: "Home", url: "/app" }}
      primaryAction={{
        content: "Bulk Import",
        onAction: handleBulkImport,
        disabled: selectedFamilies.length === 0,
      }}
    >
      <BlockStack gap="500">
        <Card>
          <BlockStack>
            {productFamilies.items.map((family: any) => (
              <div key={family.code} style={{ paddingBlock: 'var(--p-space-200)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <Checkbox
                    label={`${family.code} - ${family._links.self.href}`}
                    checked={selectedFamilies.includes(family.code)}
                    onChange={(checked) => {
                      if (checked) {
                        setSelectedFamilies([...selectedFamilies, family.code]);
                      } else {
                        setSelectedFamilies(
                          selectedFamilies.filter((code) => code !== family.code)
                        );
                      }
                    }}
                  />
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
