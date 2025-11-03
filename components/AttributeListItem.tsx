import { ResourceList, Text } from "@shopify/polaris";
import { Attribute } from "../models/attribute.server.ts";

export const AttributeListItem = ({ attribute }: { attribute: Attribute }) => {
  return (
    <ResourceList.Item
      id={attribute.code}
      accessibilityLabel={`View details for ${attribute.labels?.en_US || attribute.code}`}
    >
      <h3>
        <Text as="span" fontWeight="bold">
          {attribute.labels?.en_US || attribute.code}
        </Text>
      </h3>
      <p>{attribute.type}</p>
    </ResourceList.Item>
  );
};
