import { connect } from "@vercel/connect/eve";
import { defineMcpClientConnection } from "eve/connections";

export default defineMcpClientConnection({
  url: "https://app.pendo.io/mcp/v0/shttp",
  description: "Explore product usage and customer insights.",
  auth: connect("app.pendo.io/prj_fRpOQ1OjPZqHoUBZbeHiTYi34Yqu"),
});
