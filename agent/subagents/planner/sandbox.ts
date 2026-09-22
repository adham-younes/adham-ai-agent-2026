import { defineSandbox } from "eve/sandbox";

export default defineSandbox(({ parent }) => {
  if (parent === null) throw new Error("planner must run as a child agent");
  return parent.sandbox;
});
