import React from 'react';

interface IconProps {
  className?: string;
}

const baseClass = 'w-6 h-6';
const viewBox = '0 0 50 50';

// Category colors matching iLovePDF style
const colors = {
  organize: { color: '#EE6C4D', light: '#FBE8E2' },
  optimize: { color: '#8FBC5D', light: '#E5F5D2' },
  convert: { color: '#295795', light: '#DCE5FA' },
  edit: { color: '#AB6993', light: '#EADAe4' },
  security: { color: '#4A7AAB', light: '#D6E4F0' },
  intelligence: { color: '#7253E2', light: '#E0DDFB' },
  scan: { color: '#EE6C4D', light: '#FBE8E2' },
};

// Rounded rectangle container with category color
const Container: React.FC<{ color: string; light: string; children: React.ReactNode }> = ({ color, light, children }) => (
  <svg className={baseClass} viewBox={viewBox} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="50" height="50" rx="10" fill={light} />
    <rect x="2" y="2" width="46" height="46" rx="8" fill={color} />
    {children}
  </svg>
);

export const MergePdfIcon: React.FC<IconProps> = (props) => (
  <Container {...colors.organize} {...props}>
    <path d="M18 14h6v6h-6z" fill="white" />
    <path d="M26 14h6v6h-6z" fill="white" opacity="0.7" />
    <path d="M14 22h6v6h-6z" fill="white" opacity="0.9" />
  </Container>
);

export const SplitPdfIcon: React.FC<IconProps> = (props) => (
  <Container {...colors.organize} {...props}>
    <path d="M14 10h22v30H14z" fill="white" />
    <path d="M24 10v30" stroke={colors.organize.color} strokeWidth="3" />
  </Container>
);

export const CompressPdfIcon: React.FC<IconProps> = (props) => (
  <Container {...colors.optimize} {...props}>
    <path d="M14 18h22v4H14z" fill="white" opacity="0.9" />
    <path d="M14 24h22v4H14z" fill="white" opacity="0.7" />
    <path d="M14 30h22v4H14z" fill="white" opacity="0.5" />
  </Container>
);

export const WordToPdfIcon: React.FC<IconProps> = (props) => (
  <Container {...colors.convert} {...props}>
    <path d="M18 14h14v22H18z" fill="white" />
    <path d="M24 14v22M18 20h12M18 26h12" stroke={colors.convert.color} strokeWidth="2" />
  </Container>
);

export const PdfToWordIcon: React.FC<IconProps> = (props) => (
  <Container {...colors.convert} {...props}>
    <path d="M18 14h14v22H18z" fill="white" />
    <path d="M24 14v22M18 20h12M18 26h12" stroke={colors.convert.color} strokeWidth="2" />
  </Container>
);

export const JpgToPdfIcon: React.FC<IconProps> = (props) => (
  <Container {...colors.convert} {...props}>
    <rect x="16" y="14" width="18" height="22" rx="2" fill="white" />
    <circle cx="23" cy="21" r="2" fill={colors.convert.color} />
    <path d="M16 28l6-6 4 4 4-4 4 4" stroke={colors.convert.color} strokeWidth="2" />
  </Container>
);

export const PdfToJpgIcon: React.FC<IconProps> = (props) => (
  <Container {...colors.convert} {...props}>
    <rect x="16" y="14" width="18" height="22" rx="2" fill="white" />
    <circle cx="23" cy="21" r="2" fill={colors.convert.color} />
    <path d="M16 28l6-6 4 4 4-4 4 4" stroke={colors.convert.color} strokeWidth="2" />
  </Container>
);

export const PowerPointToPdfIcon: React.FC<IconProps> = (props) => (
  <Container {...colors.convert} {...props}>
    <rect x="16" y="12" width="18" height="26" rx="2" fill="white" />
    <rect x="20" y="16" width="10" height="2" rx="1" fill={colors.convert.color} />
    <rect x="20" y="20" width="10" height="2" rx="1" fill={colors.convert.color} opacity="0.7" />
    <rect x="20" y="24" width="10" height="2" rx="1" fill={colors.convert.color} opacity="0.5" />
  </Container>
);

export const ExcelToPdfIcon: React.FC<IconProps> = (props) => (
  <Container {...colors.convert} {...props}>
    <rect x="16" y="12" width="18" height="26" rx="2" fill="white" />
    <path d="M16 18h18M16 24h18M16 30h18M22 12v18M28 12v18" stroke={colors.convert.color} strokeWidth="1.5" />
  </Container>
);

export const HtmlToPdfIcon: React.FC<IconProps> = (props) => (
  <Container {...colors.convert} {...props}>
    <path d="M22 16l-6 8 6 8" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M28 16l6 8-6 8" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
  </Container>
);

export const PdfToPowerPointIcon: React.FC<IconProps> = (props) => (
  <Container {...colors.convert} {...props}>
    <rect x="16" y="12" width="18" height="26" rx="2" fill="white" />
    <rect x="20" y="16" width="10" height="2" rx="1" fill={colors.convert.color} />
    <rect x="20" y="20" width="10" height="2" rx="1" fill={colors.convert.color} opacity="0.7" />
    <rect x="20" y="24" width="10" height="2" rx="1" fill={colors.convert.color} opacity="0.5" />
  </Container>
);

export const PdfToExcelIcon: React.FC<IconProps> = (props) => (
  <Container {...colors.convert} {...props}>
    <rect x="16" y="12" width="18" height="26" rx="2" fill="white" />
    <path d="M16 18h18M16 24h18M16 30h18M22 12v18M28 12v18" stroke={colors.convert.color} strokeWidth="1.5" />
  </Container>
);

export const RotatePdfIcon: React.FC<IconProps> = (props) => (
  <Container {...colors.edit} {...props}>
    <path d="M24 16v8l6-4-6-4z" fill="white" />
    <path d="M20 32a12 12 0 0 1 12-12h4a16 16 0 0 0-16 16" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
  </Container>
);

export const PageNumbersIcon: React.FC<IconProps> = (props) => (
  <Container {...colors.edit} {...props}>
    <rect x="16" y="14" width="18" height="22" rx="2" fill="white" />
    <rect x="24" y="22" width="6" height="6" rx="1" fill={colors.edit.color} />
    <path d="M20 18h4M20 26h4" stroke={colors.edit.color} strokeWidth="1.5" />
  </Container>
);

export const WatermarkIcon: React.FC<IconProps> = (props) => (
  <Container {...colors.edit} {...props}>
    <rect x="16" y="14" width="18" height="22" rx="2" fill="white" />
    <path d="M20 28l6-8 6 8" stroke={colors.edit.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
  </Container>
);

export const CropPdfIcon: React.FC<IconProps> = (props) => (
  <Container {...colors.edit} {...props}>
    <rect x="18" y="14" width="22" height="22" rx="2" fill="white" />
    <path d="M18 18v14M22 14h14" stroke={colors.edit.color} strokeWidth="2.5" strokeLinecap="round" />
  </Container>
);

export const EditPdfIcon: React.FC<IconProps> = (props) => (
  <Container {...colors.edit} {...props}>
    <rect x="16" y="14" width="18" height="22" rx="2" fill="white" />
    <path d="M24 20l4 4-8 8H16v-4l8-8z" fill={colors.edit.color} />
  </Container>
);

export const UnlockPdfIcon: React.FC<IconProps> = (props) => (
  <Container {...colors.security} {...props}>
    <rect x="14" y="20" width="22" height="18" rx="2" fill="white" />
    <path d="M20 20v-5a5 5 0 0 1 10 0v5" stroke="white" strokeWidth="3" strokeLinecap="round" />
    <circle cx="25" cy="29" r="2" fill={colors.security.color} />
  </Container>
);

export const ProtectPdfIcon: React.FC<IconProps> = (props) => (
  <Container {...colors.security} {...props}>
    <path d="M24 14l14 6v10c0 8-14 14-14 14S10 38 10 30V20l14-6z" fill="white" />
    <path d="M18 24l6 6 6-6" stroke={colors.security.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </Container>
);

export const SignPdfIcon: React.FC<IconProps> = (props) => (
  <Container {...colors.security} {...props}>
    <rect x="16" y="14" width="18" height="22" rx="2" fill="white" />
    <path d="M22 26l4 4 6-8" stroke={colors.security.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </Container>
);

export const RedactPdfIcon: React.FC<IconProps> = (props) => (
  <Container {...colors.security} {...props}>
    <rect x="16" y="14" width="18" height="22" rx="2" fill="white" />
    <rect x="18" y="22" width="14" height="4" rx="1" fill={colors.security.color} />
  </Container>
);

export const ComparePdfIcon: React.FC<IconProps> = (props) => (
  <Container {...colors.security} {...props}>
    <rect x="16" y="14" width="16" height="22" rx="2" fill="white" />
    <rect x="30" y="14" width="4" height="22" rx="1" fill={colors.security.color} opacity="0.3" />
    <path d="M22 18h4M22 22h4M22 26h4" stroke={colors.security.color} strokeWidth="1.5" />
  </Container>
);

export const OrganizePdfIcon: React.FC<IconProps> = (props) => (
  <Container {...colors.organize} {...props}>
    <rect x="14" y="12" width="22" height="26" rx="2" fill="white" />
    <path d="M20 20h10M20 24h10M20 28h6" stroke={colors.organize.color} strokeWidth="2" strokeLinecap="round" />
    <path d="M18 16l4-4 4 4" stroke={colors.organize.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Container>
);

export const RepairPdfIcon: React.FC<IconProps> = (props) => (
  <Container {...colors.optimize} {...props}>
    <rect x="16" y="14" width="18" height="22" rx="2" fill="white" />
    <path d="M24 20v10M24 20l6 6M24 20l-6 6" stroke={colors.optimize.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </Container>
);

export const OcrPdfIcon: React.FC<IconProps> = (props) => (
  <Container {...colors.optimize} {...props}>
    <rect x="16" y="14" width="18" height="22" rx="2" fill="white" />
    <path d="M22 22h6M22 26h6" stroke={colors.optimize.color} strokeWidth="2" strokeLinecap="round" />
    <circle cx="26" cy="19" r="1.5" fill={colors.optimize.color} />
  </Container>
);

export const PdfToPdfaIcon: React.FC<IconProps> = (props) => (
  <Container {...colors.convert} {...props}>
    <rect x="16" y="14" width="18" height="22" rx="2" fill="white" />
    <path d="M24 22v8M24 22l-4 4M24 22l4 4" stroke={colors.convert.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Container>
);

export const ScanToPdfIcon: React.FC<IconProps> = (props) => (
  <Container {...colors.scan} {...props}>
    <rect x="16" y="14" width="18" height="22" rx="2" fill="white" />
    <path d="M20 18h10M20 22h10M20 26h6" stroke={colors.scan.color} strokeWidth="2" strokeLinecap="round" />
    <path d="M22 14v4M26 14v4M30 14v4" stroke={colors.scan.color} strokeWidth="2" strokeLinecap="round" />
  </Container>
);

export const SummarizePdfIcon: React.FC<IconProps> = (props) => (
  <Container {...colors.intelligence} {...props}>
    <path d="M24 18l4 8h-8l4-8z" fill="white" />
    <path d="M24 22l-2 4h4l-2-4z" fill={colors.intelligence.color} />
  </Container>
);

export const TranslatePdfIcon: React.FC<IconProps> = (props) => (
  <Container {...colors.intelligence} {...props}>
    <path d="M18 22h14M18 26h14" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M22 18l-4 4 4 4M28 18l4 4-4 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
  </Container>
);

export const PdfToMarkdownIcon: React.FC<IconProps> = (props) => (
  <Container {...colors.intelligence} {...props}>
    <rect x="16" y="12" width="18" height="26" rx="2" fill="white" />
    <path d="M20 18h8M20 22h8M20 26h5" stroke={colors.intelligence.color} strokeWidth="2" strokeLinecap="round" />
    <path d="M34 14v22M30 26h4M30 30h4" stroke={colors.intelligence.color} strokeWidth="1.5" />
  </Container>
);

export const RemovePagesIcon: React.FC<IconProps> = (props) => (
  <Container {...colors.organize} {...props}>
    <rect x="16" y="14" width="18" height="22" rx="2" fill="white" />
    <path d="M24 20v12M20 24h8" stroke={colors.organize.color} strokeWidth="2.5" strokeLinecap="round" />
  </Container>
);

export const ExtractPagesIcon: React.FC<IconProps> = (props) => (
  <Container {...colors.organize} {...props}>
    <rect x="16" y="14" width="18" height="22" rx="2" fill="white" />
    <rect x="28" y="14" width="6" height="10" rx="1" fill={colors.organize.color} opacity="0.3" />
    <path d="M20 20h8M20 24h8M20 28h4" stroke={colors.organize.color} strokeWidth="1.5" />
  </Container>
);

export const EditPdfTextIcon: React.FC<IconProps> = (props) => (
  <Container {...colors.edit} {...props}>
    <rect x="16" y="14" width="18" height="22" rx="2" fill="white" />
    <path d="M20 20h10M20 24h10M20 28h6" stroke={colors.edit.color} strokeWidth="2" strokeLinecap="round" />
  </Container>
);

export const PdfFormsIcon: React.FC<IconProps> = (props) => (
  <Container {...colors.edit} {...props}>
    <rect x="16" y="14" width="18" height="22" rx="2" fill="white" />
    <rect x="20" y="18" width="6" height="5" rx="1" fill={colors.edit.color} opacity="0.3" />
    <rect x="28" y="18" width="6" height="5" rx="1" fill={colors.edit.color} opacity="0.3" />
    <rect x="20" y="25" width="6" height="5" rx="1" fill={colors.edit.color} opacity="0.3" />
    <rect x="28" y="25" width="6" height="5" rx="1" fill={colors.edit.color} opacity="0.3" />
  </Container>
);
