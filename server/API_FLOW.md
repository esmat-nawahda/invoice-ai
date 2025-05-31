# Invoice AI API Flow Documentation

## Overview

The Invoice AI API provides two main endpoints for invoice processing:
1. **Extract Endpoint** - Extract data from invoice images without saving
2. **Register Endpoint** - Save extracted and reviewed invoice data to database

## API Flow

```
┌─────────────────────┐
│   Client App        │
└─────────┬───────────┘
          │
          │ 1. Send invoice image
          ▼
┌─────────────────────┐
│ POST /api/v1/       │
│ invoices/extract    │
│                     │
│ saveToDatabase:     │
│ false               │
└─────────┬───────────┘
          │
          │ 2. Return extracted JSON
          ▼
┌─────────────────────┐
│   Client App        │
│                     │
│ - Display data      │
│ - Allow editing     │
│ - User review       │
└─────────┬───────────┘
          │
          │ 3. Send reviewed data
          ▼
┌─────────────────────┐
│ POST /api/v1/       │
│ invoices/register   │
│                     │
│ With updated JSON   │
└─────────┬───────────┘
          │
          │ 4. Return saved invoice
          ▼
┌─────────────────────┐
│   Client App        │
│                     │
│ Invoice saved!      │
└─────────────────────┘
```

## Endpoint Details

### 1. Extract Invoice Data (Without Saving)

**Endpoint:** `POST /api/v1/invoices/extract`

**Purpose:** Extract structured data from an invoice image using AI without saving to database

**Headers:**
```
X-API-Key: your-api-key
Content-Type: application/json
```

**Request Body:**
```json
{
  "image": "data:image/png;base64,iVBORw0KGgoAAAANS...", // Base64 encoded image
  "type": "received", // "received" or "sent"
  "saveToDatabase": false // IMPORTANT: Set to false for extraction only
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "extracted": {
      "invoiceNumber": "INV-001",
      "invoiceDate": "2024-01-15",
      "dueDate": "2024-02-15",
      "vendor": {
        "name": "Acme Corp",
        "address": "123 Main St, City",
        "taxId": "12-3456789",
        "email": "billing@acme.com",
        "phone": "+1-555-0123"
      },
      "customer": {
        "name": "Client Inc",
        "address": "456 Oak Ave, Town",
        "taxId": "98-7654321",
        "email": "accounts@client.com",
        "phone": "+1-555-9876"
      },
      "lineItems": [
        {
          "description": "Professional Services",
          "quantity": 10,
          "unitPrice": 150,
          "amount": 1500
        }
      ],
      "subtotal": 1500,
      "taxAmount": 270,
      "taxRate": 18,
      "discountAmount": 0,
      "totalAmount": 1770,
      "currency": "USD",
      "paymentTerms": "Net 30",
      "paymentStatus": "unpaid",
      "notes": "Thank you for your business",
      "confidence": 0.95,
      "extractedAt": "2024-01-15T10:30:00Z"
    },
    "saved": null // Will be null when saveToDatabase is false
  }
}
```

### 2. Register Invoice from JSON

**Endpoint:** `POST /api/v1/invoices/register`

**Purpose:** Create a new invoice from structured JSON data (typically after extraction and review)

**Headers:**
```
X-API-Key: your-api-key
Content-Type: application/json
```

**Request Body:**
```json
{
  "type": "received", // Required: "received" or "sent"
  "invoiceData": {
    // Required fields
    "invoiceNumber": "INV-001",
    "invoiceDate": "2024-01-15",
    "vendor": {
      "name": "Acme Corp", // Required
      "address": "123 Main St, City",
      "taxId": "12-3456789",
      "email": "billing@acme.com",
      "phone": "+1-555-0123"
    },
    "customer": {
      "name": "Client Inc", // Required
      "address": "456 Oak Ave, Town",
      "taxId": "98-7654321",
      "email": "accounts@client.com",
      "phone": "+1-555-9876"
    },
    "totalAmount": 1770, // Required
    
    // Optional fields
    "dueDate": "2024-02-15",
    "lineItems": [
      {
        "description": "Professional Services",
        "quantity": 10,
        "unitPrice": 150,
        "amount": 1500
      }
    ],
    "subtotal": 1500,
    "taxAmount": 270,
    "taxRate": 18,
    "discountAmount": 0,
    "currency": "USD", // Defaults to business currency if not provided
    "paymentTerms": "Net 30",
    "paymentStatus": "unpaid", // "paid", "unpaid", "partial"
    "notes": "Thank you for your business",
    "confidence": 0.95, // Extraction confidence score
    "extractedAt": "2024-01-15T10:30:00Z" // When the data was extracted
  },
  "originalImage": { // Optional: Include the original invoice image
    "base64": "data:image/png;base64,iVBORw0KGgoAAAANS...",
    "mimeType": "image/png" // Optional, will be detected if not provided
  }
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "invoiceNumber": "INV-001",
    "invoiceDate": "2024-01-15T00:00:00.000Z",
    "vendor": {
      "name": "Acme Corp",
      "address": "123 Main St, City",
      "taxId": "12-3456789",
      "email": "billing@acme.com",
      "phone": "+1-555-0123"
    },
    "customer": {
      "name": "Client Inc",
      "address": "456 Oak Ave, Town",
      "taxId": "98-7654321",
      "email": "accounts@client.com",
      "phone": "+1-555-9876"
    },
    "totalAmount": 1770,
    "currency": "USD",
    "paymentStatus": "unpaid",
    "createdAt": "2024-01-15T11:00:00.000Z"
  }
}
```

## Implementation Examples

### JavaScript/TypeScript Example

```typescript
// Step 1: Extract invoice data
async function extractInvoiceData(imageBase64: string) {
  const response = await fetch('https://api.invoice-ai.com/api/v1/invoices/extract', {
    method: 'POST',
    headers: {
      'X-API-Key': 'your-api-key',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      image: imageBase64,
      type: 'received',
      saveToDatabase: false // Important: Don't save yet
    })
  });
  
  const result = await response.json();
  return result.data.extracted;
}

// Step 2: Display and allow user to edit
function displayAndEditInvoice(extractedData) {
  // Show in UI, allow user to modify fields
  // Return edited data
  return editedData;
}

// Step 3: Save the reviewed invoice
async function saveInvoice(invoiceData, originalImage) {
  const response = await fetch('https://api.invoice-ai.com/api/v1/invoices/register', {
    method: 'POST',
    headers: {
      'X-API-Key': 'your-api-key',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      type: 'received',
      invoiceData: invoiceData,
      originalImage: {
        base64: originalImage
      }
    })
  });
  
  const result = await response.json();
  return result.data;
}

// Complete flow
async function processInvoice(imageFile) {
  // Convert image to base64
  const base64 = await fileToBase64(imageFile);
  
  // Extract data
  const extracted = await extractInvoiceData(base64);
  
  // Let user review/edit
  const reviewed = await displayAndEditInvoice(extracted);
  
  // Save to database
  const saved = await saveInvoice(reviewed, base64);
  
  console.log('Invoice saved with ID:', saved.id);
}
```

### Python Example

```python
import requests
import base64
import json

API_KEY = "your-api-key"
BASE_URL = "https://api.invoice-ai.com/api/v1"

def extract_invoice_data(image_path):
    """Extract invoice data without saving"""
    # Read and encode image
    with open(image_path, "rb") as f:
        image_base64 = base64.b64encode(f.read()).decode()
    
    # Prepare request
    headers = {
        "X-API-Key": API_KEY,
        "Content-Type": "application/json"
    }
    
    payload = {
        "image": f"data:image/png;base64,{image_base64}",
        "type": "received",
        "saveToDatabase": False
    }
    
    # Send request
    response = requests.post(
        f"{BASE_URL}/invoices/extract",
        headers=headers,
        json=payload
    )
    
    result = response.json()
    return result["data"]["extracted"]

def save_invoice(invoice_data, original_image_base64=None):
    """Save reviewed invoice data"""
    headers = {
        "X-API-Key": API_KEY,
        "Content-Type": "application/json"
    }
    
    payload = {
        "type": "received",
        "invoiceData": invoice_data
    }
    
    # Include original image if provided
    if original_image_base64:
        payload["originalImage"] = {
            "base64": original_image_base64
        }
    
    response = requests.post(
        f"{BASE_URL}/invoices/register",
        headers=headers,
        json=payload
    )
    
    result = response.json()
    return result["data"]

# Example usage
if __name__ == "__main__":
    # Extract data
    extracted = extract_invoice_data("invoice.png")
    print("Extracted data:", json.dumps(extracted, indent=2))
    
    # User reviews and modifies data here
    reviewed_data = extracted
    reviewed_data["notes"] = "Reviewed and approved"
    
    # Save to database
    saved = save_invoice(reviewed_data)
    print(f"Invoice saved with ID: {saved['id']}")
```

## Error Handling

Both endpoints return consistent error responses:

```json
{
  "status": "error",
  "message": "Description of the error",
  "errors": [ // Validation errors if applicable
    {
      "field": "invoiceData.invoiceNumber",
      "message": "Invoice number is required"
    }
  ]
}
```

Common HTTP status codes:
- `200` - Success (extraction)
- `201` - Success (registration)
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid API key)
- `403` - Forbidden (missing permissions or rate limit exceeded)
- `500` - Internal Server Error

## Rate Limiting

Both endpoints are subject to your plan's invoice creation limits. Each successful call counts toward your monthly invoice quota.

## Best Practices

1. **Always validate extracted data** - AI extraction is powerful but not 100% accurate
2. **Handle network errors gracefully** - Implement retry logic for failed requests
3. **Store the extraction confidence** - Use it to flag invoices that need extra review
4. **Include the original image** when registering - Maintains complete audit trail
5. **Implement proper error handling** - Show meaningful messages to users
6. **Use appropriate timeouts** - Image processing can take 10-30 seconds

## Security Considerations

1. **API Key Protection** - Never expose your API key in client-side code
2. **Image Size Limits** - Maximum 10MB per image
3. **Data Validation** - Always validate data on both client and server
4. **HTTPS Only** - All API calls must use HTTPS
5. **Rate Limiting** - Implement client-side rate limiting to avoid hitting limits

## Support

For technical support or questions:
- Email: support@invoice-ai.com
- Documentation: https://docs.invoice-ai.com
- Status Page: https://status.invoice-ai.com