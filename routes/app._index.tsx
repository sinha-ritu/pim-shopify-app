import type { LoaderFunctionArgs } from "@remix-run/node";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Grid,
  Text,
  Icon,
} from "@shopify/polaris";
import {
  ProductIcon,
  CategoriesIcon,
  SettingsIcon,
  ProductCostIcon,
  AppsIcon,
} from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import { useNavigate } from "@remix-run/react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  return null;
};

const navigationItems = [
  {
    title: "Products",
    icon: ProductIcon,
    url: "/app/akeneo-products",
    description: "View and import products from Akeneo.",
  },
  {
    title: "Categories",
    icon: CategoriesIcon,
    url: "/app/akeneo-categories",
    description: "View and import categories from Akeneo.",
  },
  {
    title: "Attributes",
    icon: ProductCostIcon,
    url: "/app/akeneo-attributes",
    description: "View and import attributes from Akeneo.",
  },
  {
    title: "Families",
    icon: AppsIcon,
    url: "/app/akeneo-product-families",
    description: "View and import product families from Akeneo.",
  },
  {
    title: "Settings",
    icon: SettingsIcon,
    url: "/app/settings",
    description: "Configure your Akeneo connection settings.",
  },
];

const NavCard = ({
  title,
  icon,
  url,
  description,
}: {
  title: string;
  icon: any;
  url: string;
  description: string;
}) => {
  const navigate = useNavigate();
  return (
    <div onClick={() => navigate(url)} style={{ cursor: "pointer" }}>
      <Card>
        <BlockStack gap="200">
          <Icon source={icon} color="base" />
          <Text as="h2" variant="headingMd">
            {title}
          </Text>
          <Text as="p" variant="bodyMd">
            {description}
          </Text>
        </BlockStack>
      </Card>
    </div>
  );
};

export default function Index() {
  return (
    <Page title="Akeneo Integration">
      <Layout>
        <Layout.Section>
          <Grid>
            {navigationItems.map((item) => (
              <Grid.Cell key={item.title} columnSpan={{ xs: 6, sm: 3, md: 3, lg: 6 }}>
                <NavCard {...item} />
              </Grid.Cell>
            ))}
          </Grid>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
