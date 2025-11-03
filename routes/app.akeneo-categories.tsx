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
import { CategoryListItem } from "../components/CategoryListItem.tsx";
import { EmptyStateComponent } from "../components/EmptyState.tsx";
import type { Category } from "../models/category.server.ts";

const createCollectionInShopify = async (admin: any, category: Category) => {
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
          title: category.labels?.en_US || category.code,
          handle: category.code,
        },
      },
    }
  );

  const responseJson = await response.json();
  const errors = responseJson.data?.collectionCreate?.userErrors;

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
    const categoriesData = formData.getAll("categories[]");
    if (categoriesData.length === 0) {
      return json({ error: "No categories selected" }, { status: 400 });
    }

    const categories: Category[] = categoriesData.map((cat) =>
      JSON.parse(cat as string)
    );
    for (const category of categories) {
      const result = await createCollectionInShopify(admin, category);
      if (result.error) {
        return json({ error: result.error }, { status: 400 });
      }
    }

    return json({ success: true });
  } else {
    const categoryCode = formData.get("categoryCode") as string;
    const categoryLabel = formData.get("categoryLabel") as string;

    if (!categoryCode || !categoryLabel) {
      return json({ error: "Missing mandatory information" }, { status: 400 });
    }

    const category: Category = {
      code: categoryCode,
      labels: { en_US: categoryLabel },
      parent: null,
      _links: {},
    };

    return json(await createCollectionInShopify(admin, category));
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

    const hasNextPage = categories._links?.next?.href ? true : false;
    const hasPreviousPage = categories._links?.previous?.href ? true : false;

    return json({ categories, page, hasNextPage, hasPreviousPage });
  } catch (error: any) {
    throw new Response(error.message, { status: 500 });
  }
};

export default function AkeneoCategories() {
  const { categories, page, hasNextPage, hasPreviousPage } =
    useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();
  const submit = useSubmit();
  const navigate = useNavigate();
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

  const handleBulkImport = () => {
    const formData = new FormData();
    formData.append("actionType", "bulk");
    selectedCategories.forEach((categoryCode) => {
      const category = categories.items.find(
        (cat: Category) => cat.code === categoryCode
      );
      if (category) {
        formData.append("categories[]", JSON.stringify(category));
      }
    });
    submit(formData, { method: "post" });
    setSelectedCategories([]);
  };

  const handleViewProducts = () => {
    if (selectedCategories.length === 1) {
      navigate(`/app/akeneo-products?category=${selectedCategories[0]}`);
    }
  };

  if (!categories || categories.items.length === 0) {
    return (
      <EmptyStateComponent
        title="No categories found"
        message="No categories were found in your Akeneo instance."
      />
    );
  }

  return (
    <Page
      title="Akeneo Categories"
      backAction={{ content: "Home", onAction: () => navigate("/app") }}
      primaryAction={{
        content: "Bulk Import",
        onAction: handleBulkImport,
        disabled: selectedCategories.length === 0,
      }}
      secondaryActions={[
        {
          content: "View Products",
          onAction: handleViewProducts,
          disabled: selectedCategories.length !== 1,
        },
      ]}
    >
      <BlockStack gap="500">
        <Card>
          <ResourceList
            resourceName={{ singular: "category", plural: "categories" }}
            items={categories.items}
            renderItem={(category: Category) => (
              <CategoryListItem category={category} />
            )}
            selectedItems={selectedCategories}
            onSelectionChange={setSelectedCategories}
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
