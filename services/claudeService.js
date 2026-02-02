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
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('Failed to parse Claude response as JSON');
    }

    const result = JSON.parse(jsonMatch[0]);

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
    console.error('Claude API Error:', error);
    throw new Error(`Categorization failed: ${error.message}`);
  }
}
