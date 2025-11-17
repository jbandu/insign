# Word Document to PDF Conversion Setup

The signature system now supports automatic conversion of Word documents (.doc, .docx) to PDF format.

## 🎯 Features

- ✅ Converts Word documents (.docx, .doc) to PDF
- ✅ Converts OpenDocument Text (.odt) to PDF
- ✅ One-click conversion in signature wizard
- ✅ Creates new PDF document automatically
- ✅ Preserves original document
- ✅ Tracks conversion metadata

## 🚀 Quick Setup (CloudConvert)

### Option 1: Enable Conversion (Recommended)

1. **Sign up for CloudConvert** (Free)
   - Go to: https://cloudconvert.com/register
   - Free tier includes **25 conversions/day**
   - No credit card required for free tier

2. **Get API Key**
   - Visit: https://cloudconvert.com/dashboard/api/v2/keys
   - Click "Create new API key"
   - Copy the key

3. **Add to Environment Variables**
   ```bash
   # .env.local or Vercel Environment Variables
   CLOUDCONVERT_API_KEY=your_api_key_here
   ```

4. **Done!** Word conversion is now enabled.

### Option 2: Disable Conversion

If you don't want to enable conversion:

```bash
# .env.local
DOCUMENT_CONVERSION_DISABLED=true
```

Users will see: "Document conversion is disabled. Please upload PDF files only."

## 📝 How It Works

### User Flow

1. User selects a Word document in signature wizard
2. System shows "Convert to PDF" button
3. User clicks convert
4. CloudConvert API converts document
5. New PDF is uploaded to Vercel Blob
6. New document record created
7. User proceeds with signature workflow

### Technical Flow

```
Word Document → CloudConvert API → PDF → Vercel Blob → Database
```

**Files Involved:**
- `src/lib/document-converter.ts` - Conversion logic
- `src/app/actions/documents-convert.ts` - Server action
- `src/components/dashboard/signature-request-wizard.tsx` - UI

## 🔧 Alternative Services

### If you prefer not to use CloudConvert:

You can modify `src/lib/document-converter.ts` to use:

1. **Convertio** - https://convertio.co/api/
2. **Microsoft Graph API** - If you have Microsoft 365
3. **LibreOffice** - Self-hosted (requires Docker/server)
4. **Gotenberg** - Self-hosted Docker service
5. **Adobe PDF Services** - Adobe's API

## 💰 Pricing

**CloudConvert Free Tier:**
- ✅ 25 conversions per day
- ✅ No credit card required
- ✅ All features included
- ✅ Fast conversion (<5 seconds typical)

**CloudConvert Paid Plans:**
- $9/month for 500 conversions
- $19/month for 2,000 conversions
- $49/month for 10,000 conversions

## 🛠️ Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CLOUDCONVERT_API_KEY` | No | - | CloudConvert API key for conversions |
| `DOCUMENT_CONVERSION_DISABLED` | No | `false` | Set to `true` to disable conversion |

### Supported Formats

**Input Formats:**
- `.docx` - Word Document (Office 2007+)
- `.doc` - Word Document (Legacy)
- `.odt` - OpenDocument Text

**Output Format:**
- `.pdf` - Portable Document Format

## 🔍 Monitoring

Conversions are logged in the audit trail:

```typescript
{
  action: 'document_converted',
  metadata: {
    originalDocumentId: '...',
    convertedDocumentId: '...',
    originalMimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    conversionDate: '2025-01-17T...'
  }
}
```

## ⚠️ Limitations

1. **Conversion Time**: 2-10 seconds per document
2. **File Size**: CloudConvert free tier: max 1GB per file
3. **Daily Limit**: 25 conversions/day (free tier)
4. **Formatting**: Complex Word documents may have minor formatting differences

## 🧪 Testing

1. Upload a Word document to documents library
2. Create new signature request
3. Select the Word document
4. Click "Convert to PDF"
5. Wait for conversion (2-10 seconds)
6. Proceed with placing signature fields

## 🐛 Troubleshooting

### "Document conversion not configured"

**Solution**: Add `CLOUDCONVERT_API_KEY` to environment variables

### "Document conversion is disabled"

**Solution**: Remove or set `DOCUMENT_CONVERSION_DISABLED=false`

### "Conversion failed"

**Possible causes:**
- Invalid API key
- Document is corrupted
- Document too large
- API rate limit exceeded
- Network issue

**Check:**
1. Verify API key in CloudConvert dashboard
2. Check CloudConvert usage dashboard
3. Try a different document
4. Check server logs for detailed error

### "Conversion timed out"

**Solution**:
- Document may be very large
- Try again (may be temporary API issue)
- Check CloudConvert status page

## 📚 References

- [CloudConvert API Docs](https://cloudconvert.com/api/v2)
- [Supported Formats](https://cloudconvert.com/formats)
- [API Pricing](https://cloudconvert.com/pricing/api)
