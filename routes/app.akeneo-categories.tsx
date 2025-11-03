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

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const actionType = formData.get("actionType");

  if (actionType === "bulk") {
    const categories = formData.getAll("categories[]").map((cat) => JSON.parse(cat as string));
    const { admin } = await authenticate.admin(request);

    for (const category of categories) {
      await admin.graphql(
        `#graphql
          mutation collectionCreate($input: CollectionInput!) {
            collectionCreate(input: $input) {
              collection {
                id
              }
              userErrors {
                field
                message
              }
            }
          }`,
        {
          variables: {
            input: {
              title: category.labels?.en_US || category.code,
              handle: category.code,
            },
          },
        }
      );
    }

    return json({ success: true });
  } else {
    const categoryCode = formData.get("categoryCode") as string;
    const categoryLabel = formData.get("categoryLabel") as string;

    if (!categoryCode || !categoryLabel) {
      return json({ error: "Missing mandatory information" }, { status: 400 });
    }

    const { admin } = await authenticate.admin(request);

    const response = await admin.graphql(
      `#graphql
      mutation collectionCreate($input: CollectionInput!) {
        collectionCreate(input: $input) {
          collection {
            id
          }
          userErrors {
            field
            message
          }
        }
      }`,
      {
        variables: {
          input: {
            title: categoryLabel,
            handle: categoryCode,
          },
        },
      }
    );

    const responseJson = await response.json();
    const errors = responseJson.data?.collectionCreate?.userErrors;

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
    const categories = await akeneoClient.category.get({
      query: { page: page, limit: limit },
    });
    return json({ categories, page });
  } catch (error) {
    console.error('Failed to connect to Akeneo:', error);
    throw new Response("Failed to connect to Akeneo", { status: 500 });
  }
};

import { Checkbox } from "@shopify/polaris";
import { useState } from "react";

export default function AkeneoCategories() {
  const { categories, page } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  useEffect(() => {
    if (fetcher.data) {
      if (fetcher.data.success) {
        shopify.toast.show("Category created successfully in Shopify");
      } else if (fetcher.data.error) {
        shopify.toast.show(fetcher.data.error, { isError: true });
      }
    }
  }, [fetcher.data, shopify]);

  // @ts-ignore
  const hasNextPage = categories._links?.next?.href ? true : false;
  // @ts-ignore
  const hasPreviousPage = categories._links?.previous?.href ? true : false;

  const handleBulkImport = () => {
    const formData = new FormData();
    formData.append("actionType", "bulk");
    selectedCategories.forEach((categoryCode) => {
      const category = categories.items.find((cat: any) => cat.code === categoryCode);
      if (category) {
        formData.append("categories[]", JSON.stringify(category));
      }
    });
    fetcher.submit(formData, { method: "post" });
  };

  return (
    <Page
      title="Akeneo Categories"
      backAction={{ content: "Home", url: "/app" }}
      primaryAction={{
        content: "Bulk Import",
        onAction: handleBulkImport,
        disabled: selectedCategories.length === 0,
      }}
    >
      <BlockStack gap="500">
        <Card>
          <BlockStack>
            {categories.items.map((category: any) => (
              <div key={category.code} style={{ paddingBlock: 'var(--p-space-200)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <Checkbox
                    label={category.code}
                    checked={selectedCategories.includes(category.code)}
                    onChange={(checked) => {
                      if (checked) {
                        setSelectedCategories([...selectedCategories, category.code]);
                      } else {
                        setSelectedCategories(
                          selectedCategories.filter((code) => code !== category.code)
                        );
                      }
                    }}
                  />
                  <fetcher.Form method="post">
                    <input type="hidden" name="categoryCode" value={category.code} />
                    <input type="hidden" name="categoryLabel" value={category.labels?.en_US || category.code} />
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
