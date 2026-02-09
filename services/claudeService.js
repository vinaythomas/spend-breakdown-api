import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// 17 categories as per spec
const VALID_CATEGORIES = [
  'Groceries',
  'Dining & Takeout',
  'Transport',
  'Housing',
  'Utilities',
  'Banking & Fees',
  'Insurance',
  'Subscriptions',
  'Shopping',
  'Travel',
  'Healthcare',
  'Entertainment',
  'Education',
  'Pets',
  'Income',
  'Refunds',
  'Other'
];

/**
 * Categorize transactions using Claude AI and generate insights
 * @param {Array} transactions - Array of {description, amount, date}
 * @returns {Object} - {categories: Array, insights: Array}
 */
export async function categorizeTransactions(transactions) {
  const prompt = `You are a financial categorization expert. Categorize these bank transactions into ONE of these 17 categories:

${VALID_CATEGORIES.join(', ')}

RULES:
1. Positive amounts (income):
   - "Income" for salary, wages, payroll
   - "Refunds" for returns, refunds, chargebacks
2. Negative amounts (expenses):
   - "Banking & Fees" for bank charges, ATM fees, overdraft fees
   - Match merchant/description to the most specific category
   - If unclear → "Other"
3. Always return a valid category from the list above

TRANSACTIONS:
${JSON.stringify(transactions, null, 2)}

Return JSON in this EXACT format:
{
  "categories": [
    {"description": "transaction description", "amount": -25.50, "category": "Groceries"}
  ],
  "insights": [
    "Insight 1 with specific amounts and actionable advice",
    "Insight 2 with specific amounts and actionable advice",
    "Insight 3 with specific amounts and actionable advice"
  ]
}

CRITICAL: Return ONLY valid JSON. Ensure:
- All strings are properly quoted with double quotes
- All arrays have proper comma separation
- No trailing commas in arrays or objects
- All special characters in descriptions are properly escaped
- Test the JSON is valid before returning it

INSIGHTS REQUIREMENTS:
- Provide 3-5 actionable insights about spending patterns
- Mention specific amounts and percentages
- Be concrete and helpful (e.g., "You spent $450 on Dining & Takeout, which is 30% of your expenses. Consider meal prepping to reduce this.")
- Focus on: high spending categories, unusual patterns, savings opportunities`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    // Extract JSON from response
    const responseText = message.content[0].text;

    // Try to extract JSON from response
    let result;
    try {
      // First attempt: Direct JSON parsing
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      result = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('JSON parse error:', parseError.message);
      console.error('Raw response:', responseText.substring(0, 500) + '...');

      // Fallback: Return default structure to prevent total failure
      result = {
        categories: transactions.map(t => ({
          description: t.description,
          amount: t.amount,
          date: t.date,
          category: 'Other'  // Safe default
        })),
        insights: [
          'Unable to generate AI insights at this time',
          'Your transactions have been categorized with default categories',
          'Please try uploading again for AI-powered categorization'
        ]
      };
    }

    // Validate and fallback invalid categories
    result.categories = result.categories.map(cat => ({
      ...cat,
      category: VALID_CATEGORIES.includes(cat.category) ? cat.category : 'Other'
    }));

    // Ensure we have insights
    if (!result.insights || !Array.isArray(result.insights) || result.insights.length < 3) {
      result.insights = [
        'Upload more months to see personalized spending insights',
        'Track your largest expense categories to identify savings opportunities',
        'Set a savings goal to reduce spending in specific categories'
      ];
    }

    return result;
  } catch (error) {
    console.error('Claude API Error:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    throw new Error(`Categorization failed: ${error.message}`);
  }
}

/**
 * Extract and categorize transactions from PDF bank statement using Claude Vision
 * @param {string} pdfBase64 - Base64 encoded PDF file
 * @returns {Object} - {categories: Array, insights: Array}
 */
export async function categorizePdfStatement(pdfBase64) {
  const prompt = `Extract all transactions from this bank statement PDF and categorize each into ONE of these 17 categories:

${VALID_CATEGORIES.join(', ')}

EXTRACTION RULES:
1. Extract ALL transactions from ALL pages
2. For each transaction, extract:
   - Date (in DD-MM-YYYY format)
   - Description (merchant/transaction name - keep original)
   - Amount (use negative for debits/expenses, positive for credits/income)
3. Handle debit/credit columns:
   - If separate columns: use amount_debited (negative) or amount_credited (positive)
   - Combine into single amount field

CATEGORIZATION RULES:
1. Positive amounts (income):
   - "Income" for salary, wages, payroll
   - "Refunds" for returns, refunds, chargebacks
2. Negative amounts (expenses):
   - "Banking & Fees" for bank charges, ATM fees, overdraft fees
   - Match merchant/description to the most specific category
   - If unclear → "Other"
3. Always return a valid category from the list above

Return JSON in this EXACT format:
{
  "categories": [
    {"description": "transaction description", "amount": -25.50, "category": "Groceries"}
  ],
  "insights": [
    "Insight 1 with specific amounts and actionable advice",
    "Insight 2 with specific amounts and actionable advice",
    "Insight 3 with specific amounts and actionable advice"
  ]
}

INSIGHTS REQUIREMENTS:
- Provide 3-5 actionable insights about spending patterns
- Mention specific amounts and percentages
- Be concrete and helpful (e.g., "You spent €450 on Dining & Takeout, which is 30% of your expenses. Consider meal prepping to reduce this.")
- Focus on: high spending categories, unusual patterns, savings opportunities

CRITICAL: Return ONLY valid JSON. Ensure:
- All strings are properly quoted with double quotes
- All arrays have proper comma separation
- No trailing commas in arrays or objects
- All special characters in descriptions are properly escaped
- Test the JSON is valid before returning it
- Do not include any text before or after the JSON`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: pdfBase64
              }
            },
            {
              type: 'text',
              text: prompt
            }
          ]
        }
      ]
    });

    // Extract JSON from response
    const responseText = message.content[0].text;

    // Try to extract JSON from response
    let result;
    try {
      // First attempt: Direct JSON parsing
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      result = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('JSON parse error:', parseError.message);
      console.error('Raw response:', responseText.substring(0, 500) + '...');

      // Fallback: Return default structure to prevent total failure
      result = {
        categories: [],
        insights: [
          'Unable to extract transactions from PDF at this time',
          'Please ensure your PDF is a valid bank statement',
          'Try uploading a CSV file instead for better results'
        ]
      };
    }

    // Validate and fallback invalid categories
    result.categories = result.categories.map(cat => ({
      ...cat,
      category: VALID_CATEGORIES.includes(cat.category) ? cat.category : 'Other'
    }));

    // Ensure we have insights
    if (!result.insights || !Array.isArray(result.insights) || result.insights.length < 3) {
      result.insights = [
        'Upload more months to see personalized spending insights',
        'Track your largest expense categories to identify savings opportunities',
        'Set a savings goal to reduce spending in specific categories'
      ];
    }

    return result;
  } catch (error) {
    console.error('Claude Vision API Error:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    // Provide helpful error messages
    if (error.message?.includes('invalid_pdf')) {
      throw new Error('Invalid PDF file. Please upload a valid bank statement PDF.');
    }

    throw new Error(`PDF processing failed: ${error.message}`);
  }
}
