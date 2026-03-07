import { registerSourceProvider } from "@/lib/sources/registry";
import { SlackSourceProvider } from "./slack-source-provider";

registerSourceProvider("slack", () => new SlackSourceProvider());
