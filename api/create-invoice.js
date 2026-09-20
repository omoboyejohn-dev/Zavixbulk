export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed"
    });
  }

  try {
    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : req.body || {};

    const amount = Number(body.amount_usd);
    const description =
      body.description || "Zavixbulk Wallet Deposit";

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid deposit amount."
      });
    }

    if (amount < 1) {
      return res.status(400).json({
        success: false,
        error: "Minimum deposit is $1."
      });
    }

    if (!process.env.MG_API_KEY) {
      return res.status(500).json({
        success: false,
        error: "MG Crypto API key is not configured."
      });
    }

    const response = await fetch(
      "https://www.markgroup.app/api/v1/invoices",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.MG_API_KEY}`,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          amount_usd: amount,
          description
        })
      }
    );

    const text = await response.text();

    let data;

    try {
      data = JSON.parse(text);
    } catch {
      data = {
        raw: text
      };
    }

    console.log("MG Crypto status:", response.status);
    console.log("MG Crypto response:", data);

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: "MG Crypto rejected the invoice request.",
        details: data
      });
    }

    /*
      MG Crypto's exact response structure can vary.
      Look for the payment URL in the common locations.
    */

    const paymentUrl =
      data?.payment_url ||
      data?.checkout_url ||
      data?.invoice_url ||
      data?.url ||
      data?.data?.payment_url ||
      data?.data?.checkout_url ||
      data?.data?.invoice_url ||
      data?.data?.url ||
      data?.invoice?.payment_url ||
      data?.invoice?.checkout_url ||
      data?.invoice?.url;

    if (!paymentUrl) {
      return res.status(502).json({
        success: false,
        error: "MG Crypto created a response, but no payment URL was found.",
        data
      });
    }

    return res.status(200).json({
      success: true,
      payment_url: paymentUrl,
      data
    });

  } catch (error) {
    console.error("Create invoice error:", error);

    return res.status(500).json({
      success: false,
      error: "Unable to create Bitcoin invoice.",
      message: error.message
    });
  }
}
