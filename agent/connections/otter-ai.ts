import { connect } from "@vercel/connect/eve";
import { defineMcpClientConnection } from "eve/connections";

export default defineMcpClientConnection({
  url: "https://mcp.otter.ai/mcp",
  description: "Search meeting transcripts and summaries.",
  auth: connect("mcp.otter.ai/prj_fRpOQ1OjPZqHoUBZbeHiTYi34Yqu"),
});
