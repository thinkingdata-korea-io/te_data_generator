# Security Notes

## Known Vulnerabilities and Mitigations

### xlsx (SheetJS) Library - HIGH Severity

**Status**: No fix available (as of 2025-12-02)

**Vulnerabilities**:
- Prototype Pollution ([GHSA-4r6h-8v6p-xvw6](https://github.com/advisories/GHSA-4r6h-8v6p-xvw6))
- Regular Expression Denial of Service (ReDoS) ([GHSA-5pgg-2g8v-p4x9](https://github.com/advisories/GHSA-5pgg-2g8v-p4x9))

**Current Version**: 0.18.5 (latest available)

**Risk Assessment**:
- **Attack Vector**: Parsing maliciously crafted Excel files uploaded by users
- **Impact**:
  - Prototype Pollution: Could allow attackers to modify object prototypes
  - ReDoS: Could cause service degradation through CPU-intensive regex operations

**Mitigation Strategies**:

1. **Input Validation** (Implemented):
   - Validate file size limits before processing
   - Check file extensions and MIME types
   - Implement request rate limiting

2. **Sandboxing** (Recommended):
   - Process Excel files in isolated workers or containers
   - Set CPU and memory limits for file processing operations
   - Implement timeouts for parsing operations

3. **Alternative Libraries** (Future Consideration):
   - **ExcelJS**: More actively maintained, better security track record
   - **Migration Effort**: Medium (API differences require code changes in 3 files)

**Current Implementation**:
The xlsx library is used in the following files:
- `src/excel/parser.ts`
- `src/utils/analysis-excel-generator.ts`
- `src/utils/analysis-excel-parser.ts`

**Monitoring**:
- Regularly check npm audit reports
- Monitor [SheetJS security advisories](https://github.com/SheetJS/sheetjs/security/advisories)
- Consider switching to ExcelJS when time permits

## Fixed Vulnerabilities

### body-parser - MODERATE Severity
**Status**: ✓ Fixed (2025-12-02)
- Updated to patched version via `npm audit fix`

### express - LOW Severity
**Status**: ✓ Fixed (2025-12-02)
- Updated to patched version via `npm audit fix`

## Security Best Practices

1. **Regular Updates**:
   - Run `npm audit` regularly
   - Keep dependencies up to date
   - Monitor security advisories

2. **Production Configuration**:
   - Change default JWT_SECRET
   - Use strong database passwords
   - Enable HTTPS in production
   - Set appropriate CORS policies

3. **File Upload Security**:
   - Limit file sizes (currently enforced)
   - Validate file types
   - Scan uploaded files
   - Store files outside web root

4. **Database Security**:
   - Use parameterized queries (implemented via Prisma)
   - Regular backups
   - Principle of least privilege for DB users

## Reporting Security Issues

If you discover a security vulnerability, please report it to:
- **Contact**: [Your security contact]
- **Response Time**: Within 48 hours

Do not publicly disclose security issues until they have been addressed.
