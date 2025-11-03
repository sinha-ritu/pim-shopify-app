export type Attribute = {
  code: string;
  type: string;
  labels: {
    [key: string]: string;
  };
  _links: {
    next?: {
      href: string;
    };
    previous?: {
      href: string;
    };
  };
};
