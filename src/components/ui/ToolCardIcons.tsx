import React from 'react';
import {
  PageStackIcon,
  ConversionIcon,
  CompressIcon,
  SecurityIcon,
} from './ToolIcons';

const categoryConfig: Record<string, { color: string; light: string }> = {
  organize: { color: '#f97316', light: '#fed7aa' },
  optimize: { color: '#22c55e', light: '#bbf7d0' },
  convert: { color: '#295795', light: '#dce5fa' },
  image: { color: '#a855f7', light: '#e9d5ff' },
  edit: { color: '#14b8a6', light: '#99f6e4' },
  security: { color: '#ef4444', light: '#fecaca' },
};

export const MergePdfIcon: React.FC<{ className?: string }> = ({ className }) => (
  <div className={className}><PageStackIcon accentColor={categoryConfig.organize.color} light={categoryConfig.organize.light} arrowDirection="inward" /></div>
);
export const SplitPdfIcon: React.FC<{ className?: string }> = ({ className }) => (
  <div className={className}><PageStackIcon accentColor={categoryConfig.organize.color} light={categoryConfig.organize.light} arrowDirection="outward" /></div>
);
export const CompressPdfIcon: React.FC<{ className?: string }> = ({ className }) => (
  <div className={className}><CompressIcon /></div>
);
export const WordToPdfIcon: React.FC<{ className?: string }> = ({ className }) => (
  <div className={className}><ConversionIcon badgeLetter="W" badgeColor="#2563eb" pageColor="#dce5fa" direction="inward" /></div>
);
export const PdfToWordIcon: React.FC<{ className?: string }> = ({ className }) => (
  <div className={className}><ConversionIcon badgeLetter="W" badgeColor="#2563eb" pageColor="#dce5fa" direction="outward" /></div>
);
export const JpgToPdfIcon: React.FC<{ className?: string }> = ({ className }) => (
  <div className={className}><ConversionIcon badgeLetter="J" badgeColor="#a855f7" pageColor="#e9d5ff" direction="inward" /></div>
);
export const PdfToJpgIcon: React.FC<{ className?: string }> = ({ className }) => (
  <div className={className}><ConversionIcon badgeLetter="J" badgeColor="#a855f7" pageColor="#e9d5ff" direction="outward" /></div>
);
export const PowerPointToPdfIcon: React.FC<{ className?: string }> = ({ className }) => (
  <div className={className}><ConversionIcon badgeLetter="P" badgeColor="#ea580c" pageColor="#ffedd5" direction="inward" /></div>
);
export const ExcelToPdfIcon: React.FC<{ className?: string }> = ({ className }) => (
  <div className={className}><ConversionIcon badgeLetter="X" badgeColor="#16a34a" pageColor="#dcfce7" direction="inward" /></div>
);
export const HtmlToPdfIcon: React.FC<{ className?: string }> = ({ className }) => (
  <div className={className}><ConversionIcon badgeLetter="H" badgeColor="#295795" pageColor="#dce5fa" direction="inward" /></div>
);
export const PdfToPowerPointIcon: React.FC<{ className?: string }> = ({ className }) => (
  <div className={className}><ConversionIcon badgeLetter="P" badgeColor="#ea580c" pageColor="#ffedd5" direction="outward" /></div>
);
export const PdfToExcelIcon: React.FC<{ className?: string }> = ({ className }) => (
  <div className={className}><ConversionIcon badgeLetter="X" badgeColor="#16a34a" pageColor="#dcfce7" direction="outward" /></div>
);
export const RotatePdfIcon: React.FC<{ className?: string }> = ({ className }) => (
  <div className={className}><PageStackIcon accentColor={categoryConfig.edit.color} light={categoryConfig.edit.light} arrowDirection="inward" /></div>
);
export const PageNumbersIcon: React.FC<{ className?: string }> = ({ className }) => (
  <div className={className}><PageStackIcon accentColor={categoryConfig.edit.color} light={categoryConfig.edit.light} arrowDirection="inward" /></div>
);
export const WatermarkIcon: React.FC<{ className?: string }> = ({ className }) => (
  <div className={className}><PageStackIcon accentColor={categoryConfig.edit.color} light={categoryConfig.edit.light} arrowDirection="inward" /></div>
);
export const CropPdfIcon: React.FC<{ className?: string }> = ({ className }) => (
  <div className={className}><PageStackIcon accentColor={categoryConfig.edit.color} light={categoryConfig.edit.light} arrowDirection="inward" /></div>
);
export const EditPdfIcon: React.FC<{ className?: string }> = ({ className }) => (
  <div className={className}><PageStackIcon accentColor={categoryConfig.edit.color} light={categoryConfig.edit.light} arrowDirection="inward" /></div>
);
export const UnlockPdfIcon: React.FC<{ className?: string }> = ({ className }) => (
  <div className={className}><SecurityIcon accentColor={categoryConfig.security.color} light={categoryConfig.security.light} symbol="lock" /></div>
);
export const ProtectPdfIcon: React.FC<{ className?: string }> = ({ className }) => (
  <div className={className}><SecurityIcon accentColor={categoryConfig.security.color} light={categoryConfig.security.light} symbol="lock" /></div>
);
export const SignPdfIcon: React.FC<{ className?: string }> = ({ className }) => (
  <div className={className}><SecurityIcon accentColor={categoryConfig.security.color} light={categoryConfig.security.light} symbol="pen" /></div>
);
export const RedactPdfIcon: React.FC<{ className?: string }> = ({ className }) => (
  <div className={className}><SecurityIcon accentColor={categoryConfig.security.color} light={categoryConfig.security.light} symbol="pen" /></div>
);
export const ComparePdfIcon: React.FC<{ className?: string }> = ({ className }) => (
  <div className={className}><PageStackIcon accentColor={categoryConfig.security.color} light={categoryConfig.security.light} arrowDirection="outward" /></div>
);
export const OrganizePdfIcon: React.FC<{ className?: string }> = ({ className }) => (
  <div className={className}><PageStackIcon accentColor={categoryConfig.organize.color} light={categoryConfig.organize.light} arrowDirection="inward" /></div>
);
export const RepairPdfIcon: React.FC<{ className?: string }> = ({ className }) => (
  <div className={className}><PageStackIcon accentColor={categoryConfig.optimize.color} light={categoryConfig.optimize.light} arrowDirection="inward" /></div>
);
export const OcrPdfIcon: React.FC<{ className?: string }> = ({ className }) => (
  <div className={className}><ConversionIcon badgeLetter="O" badgeColor="#a855f7" pageColor="#e9d5ff" direction="inward" /></div>
);
export const PdfToPdfaIcon: React.FC<{ className?: string }> = ({ className }) => (
  <div className={className}><PageStackIcon accentColor={categoryConfig.optimize.color} light={categoryConfig.optimize.light} arrowDirection="inward" /></div>
);
export const ScanToPdfIcon: React.FC<{ className?: string }> = ({ className }) => (
  <div className={className}><ConversionIcon badgeLetter="S" badgeColor="#a855f7" pageColor="#e9d5ff" direction="inward" /></div>
);
export const SummarizePdfIcon: React.FC<{ className?: string }> = ({ className }) => (
  <div className={className}><PageStackIcon accentColor="#7253E2" light="#E0DDFB" arrowDirection="inward" /></div>
);
export const TranslatePdfIcon: React.FC<{ className?: string }> = ({ className }) => (
  <div className={className}><PageStackIcon accentColor="#7253E2" light="#E0DDFB" arrowDirection="inward" /></div>
);
export const PdfToMarkdownIcon: React.FC<{ className?: string }> = ({ className }) => (
  <div className={className}><ConversionIcon badgeLetter="M" badgeColor="#7253E2" pageColor="#E0DDFB" direction="inward" /></div>
);
