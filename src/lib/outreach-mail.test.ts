import { describe, expect, it } from "vitest";
import {
  base64Url,
  buildMime,
  encodeHeaderValue,
  formatFrom,
  rejectionReason,
  threadSubject,
  type OutboxRow,
} from "./outreach-mail";

const small =
  "Wigsmi is a trading name of Sherwood Consulting Services Ltd, registered in England and Wales, company number 13972872. If you'd rather not hear from me, reply \"no thanks\" and I won't contact you again.";
const address = " Correspondence address: 78 York Street, London W1H 1DP, United Kingdom.";

function row(over: Partial<OutboxRow> = {}): OutboxRow {
  return {
    id: "1",
    kind: "first",
    to_email: "hello@shop.example",
    subject: "Your wig, on your customer's own face",
    body_html: `<p>Try it at <a href="https://wigsmi.com/try-on">wigsmi.com/try-on</a></p><p>${small}</p>`,
    body_text: `Try it at https://wigsmi.com/try-on\n\n${small}`,
    thread_id: null,
    country: "UK",
    ...over,
  };
}

describe("rejectionReason", () => {
  it("accepts a well-formed first email", () => {
    expect(rejectionReason(row(), "info@wigsmi.com")).toBeNull();
  });
  it("rejects google redirect links", () => {
    const r = row({
      body_html: row().body_html.replace(
        "https://wigsmi.com/try-on",
        "https://www.google.com/url?q=https://wigsmi.com",
      ),
    });
    expect(rejectionReason(r, "info@wigsmi.com")).toMatch(/redirect/);
  });
  it("requires the company and opt-out lines in both bodies", () => {
    expect(rejectionReason(row({ body_text: "Hi" }), "info@wigsmi.com")).toMatch(/company line/);
    expect(
      rejectionReason(row({ body_html: "<p>company number 13972872</p>" }), "info@wigsmi.com"),
    ).toMatch(/opt-out/);
  });
  it("puts the correspondence address on US and Canadian email only", () => {
    const withAddress = {
      body_text: row().body_text + address,
      body_html: row().body_html + address,
    };
    expect(rejectionReason(row({ country: "USA" }), "info@wigsmi.com")).toMatch(
      /missing the correspondence/,
    );
    expect(
      rejectionReason(row({ country: "Canada", ...withAddress }), "info@wigsmi.com"),
    ).toBeNull();
    expect(
      rejectionReason(row({ country: "United States", ...withAddress }), "info@wigsmi.com"),
    ).toBeNull();
    expect(rejectionReason(row({ country: "Nigeria", ...withAddress }), "info@wigsmi.com")).toMatch(
      /only for the USA/,
    );
    expect(rejectionReason(row({ country: "" }), "info@wigsmi.com")).toMatch(/country/);
  });
  it("rejects several recipients, header injection and missing threads", () => {
    expect(
      rejectionReason(row({ to_email: "a@b.com, c@d.com" }), "info@wigsmi.com"),
    ).not.toBeNull();
    expect(
      rejectionReason(row({ subject: "Hi\r\nBcc: x@y.com" }), "info@wigsmi.com"),
    ).not.toBeNull();
    expect(rejectionReason(row({ kind: "follow_up" }), "info@wigsmi.com")).toMatch(/thread_id/);
    expect(rejectionReason(row({ to_email: "INFO@wigsmi.com" }), "info@wigsmi.com")).toMatch(
      /sender/,
    );
    expect(
      rejectionReason(
        row({ body_html: row().body_html + "<script>x</script>" }),
        "info@wigsmi.com",
      ),
    ).toMatch(/disallowed/);
  });
});

describe("mime", () => {
  it("keeps links exactly as written", () => {
    const mime = buildMime({
      from: formatFrom("Ayo Ayeni, Wigsmi", "info@wigsmi.com"),
      to: "hello@shop.example",
      subject: "Café wigs",
      html: row().body_html,
      text: row().body_text,
      inReplyTo: "<a@mail.gmail.com>",
      references: "<a@mail.gmail.com>",
      boundary: "b",
    });
    expect(mime).toContain('From: "Ayo Ayeni, Wigsmi" <info@wigsmi.com>');
    expect(mime).toContain("Subject: =?UTF-8?B?");
    expect(mime).toContain("In-Reply-To: <a@mail.gmail.com>");
    const htmlPart = mime.split("--b")[2].split("\r\n\r\n")[1].replace(/\r\n/g, "");
    const decoded = new TextDecoder().decode(
      Uint8Array.from(atob(htmlPart), (c) => c.charCodeAt(0)),
    );
    expect(decoded).toContain('href="https://wigsmi.com/try-on"');
  });
  it("encodes helpers", () => {
    expect(encodeHeaderValue("Plain")).toBe("Plain");
    expect(base64Url("??>")).not.toMatch(/[+/=]/);
    expect(threadSubject("Your wig")).toBe("Re: Your wig");
    expect(threadSubject("RE: Your wig")).toBe("RE: Your wig");
  });
});
