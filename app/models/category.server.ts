export type Category = {
  code: string;
  parent: string | null;
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
