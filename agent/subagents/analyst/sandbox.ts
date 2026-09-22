import { defineSandbox } from "eve/sandbox";

export default defineSandbox(({ parent }) => {
  if (parent === null) throw new Error("analyst must run as a child agent");
  return parent.sandbox;
});
