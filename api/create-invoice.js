export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed"
    });
  }

  try {
    const apiKey = process.env.MG_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: "MG_API_KEY is not configured in Vercel."
      });
    }

    const {
      amount_usd,
      description
    } = req.body || {};

    const amount = Number(amount_usd);

    if (!Number.isFinite(amount) || amount < 1) {
      return res.status(400).json({
        success: false,
        error: "Minimum deposit amount is $1."
      });
    }

    const response = await fetch(
      "https://www.markgroup.app/api/v1/invoices",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          amount_usd: amount,
          description:
            description || "Zavixbulk Bitcoin Wallet Deposit"
        })
      }
    );

    const responseText = await response.text();

    let providerData;

    try {
      providerData = JSON.parse(responseText);
    } catch {
      providerData = {
        raw_response: responseText
      };
    }

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: "MG Crypto rejected the invoice request.",
        mg_status: response.status,
        mg_response: providerData
      });
    }

    /*
      Look for a payment URL in common response fields.
      This does not expose your API key.
    */
    const findUrl = (obj) => {
      if (!obj || typeof obj !== "object") return null;

      for (const key of Object.keys(obj)) {
        const value = obj[key];

        if (
          typeof value === "string" &&
          /^https?:\/\//i.test(value)
        ) {
          return value;
        }

        if (value && typeof value === "object") {
          const nested = findUrl(value);

          if (nested) {
            return nested;
          }
        }
      }

      return null;
    };

    const paymentUrl = findUrl(providerData);

    if (!paymentUrl) {
      return res.status(502).json({
        success: false,
        error: "MG Crypto accepted the request, but no payment URL was found.",
        mg_response: providerData
      });
    }

    return res.status(200).json({
      success: true,
      payment_url: paymentUrl,
      mg_response: providerData
    });

  } catch (error) {
    console.error("MG Crypto error:", error);

    return res.status(500).json({
      success: false,
      error: "Server error while connecting to MG Crypto.",
      details: error.message
    });
  }
}
