import { connect } from "@vercel/connect/eve";
import { defineMcpClientConnection } from "eve/connections";

export default defineMcpClientConnection({
  url: "https://mcp.agentmail.to/mcp",
  description: "Email inboxes for AI agents",
  auth: connect("mcp.agentmail.to/prj_fRpOQ1OjPZqHoUBZbeHiTYi34Yqu"),
});
