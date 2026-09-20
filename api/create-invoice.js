export default async function handler(req, res) {

    // Only allow POST requests
    if (req.method !== "POST") {
        return res.status(405).json({
            error: "Method not allowed"
        });
    }

    try {

        // Get the secret API key from Vercel
        const apiKey = process.env.MG_API_KEY;

        if (!apiKey) {
            return res.status(500).json({
                error: "MG Crypto API key is not configured."
            });
        }

        const {
            amount_usd,
            description
        } = req.body || {};

        const amount = Number(amount_usd);

        // Validate amount
        if (!Number.isFinite(amount) || amount <= 0) {
            return res.status(400).json({
                error: "Invalid deposit amount."
            });
        }

        // Send invoice request to MG Crypto
        const mgResponse = await fetch(
            "https://www.markgroup.app/api/v1/invoices",
            {
                method: "POST",

                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    amount_usd: amount,
                    description:
                        description || "Zavixbulk Wallet Deposit"
                })
            }
        );

        const responseText = await mgResponse.text();

        let data;

        try {
            data = JSON.parse(responseText);
        } catch {
            data = {
                raw: responseText
            };
        }

        // MG Crypto returned an error
        if (!mgResponse.ok) {

            return res.status(mgResponse.status).json({
                error:
                    data?.error ||
                    data?.message ||
                    "MG Crypto invoice creation failed."
            });
        }

        // Successfully created invoice
        return res.status(200).json(data);

    } catch (error) {

        console.error("MG Crypto Error:", error);

        return res.status(500).json({
            error: "Unable to connect to MG Crypto."
        });
    }
}
