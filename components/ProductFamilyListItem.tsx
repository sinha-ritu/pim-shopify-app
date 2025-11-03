import { ResourceList, Text } from "@shopify/polaris";
import { Family } from "../models/family.server";

export const ProductFamilyListItem = ({ family }: { family: Family }) => {
  return (
    <ResourceList.Item
      id={family.code}
      accessibilityLabel={`View details for ${family.code}`}
    >
      <h3>
        <Text as="span" fontWeight="bold">{family.code}</Text>
      </h3>
      <p>{family.attribute_as_label}</p>
    </ResourceList.Item>
  );
};
