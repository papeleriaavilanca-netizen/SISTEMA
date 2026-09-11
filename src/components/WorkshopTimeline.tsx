import React from 'react';
import {
  ShoppingCart,
  Package,
  Monitor,
  Check,
  CheckCheck,
  Clock,
  Home,
  AlertCircle,
  Truck,
} from 'lucide-react';
import { WorkshopOrderStatus, WorkshopOrderTimelineStep } from '../types';

interface WorkshopTimelineProps {
  currentStatus: WorkshopOrderStatus;
  timeline: WorkshopOrderTimelineStep[];
  onSelectStep?: (status: WorkshopOrderStatus) => void;
  interactive?: boolean;
}

export interface StatusTheme {
  key: WorkshopOrderStatus;
  stepNumber: number;
  label: string;
  colorName: string;
  bgActive: string;
  bgSubtle: string;
  bgCard: string;
  border: string;
  borderAccent: string;
  text: string;
  textAccent: string;
  badge: string;
  tag: string;
  dot: string;
  glow: string;
}

export const WORKSHOP_STATUS_THEMES: Record<WorkshopOrderStatus, StatusTheme> = {
  ACEPTADO: {
    key: 'ACEPTADO',
    stepNumber: 1,
    label: '1- ACEPTADO',
    colorName: 'Azul',
    bgActive: 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-400/50',
    bgSubtle: 'bg-blue-50/90',
    bgCard: 'bg-blue-50/60 hover:bg-blue-100/70 border-blue-200 hover:border-blue-400',
    border: 'border-blue-300',
    borderAccent: 'border-blue-600',
    text: 'text-blue-950',
    textAccent: 'text-blue-700',
    badge: 'bg-blue-600 text-white',
    tag: 'bg-blue-100 text-blue-900 border border-blue-200',
    dot: 'bg-blue-600',
    glow: 'shadow-blue-500/20',
  },
  CONFIRMADO: {
    key: 'CONFIRMADO',
    stepNumber: 1,
    label: '1- ACEPTADO',
    colorName: 'Azul',
    bgActive: 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-400/50',
    bgSubtle: 'bg-blue-50/90',
    bgCard: 'bg-blue-50/60 hover:bg-blue-100/70 border-blue-200 hover:border-blue-400',
    border: 'border-blue-300',
    borderAccent: 'border-blue-600',
    text: 'text-blue-950',
    textAccent: 'text-blue-700',
    badge: 'bg-blue-600 text-white',
    tag: 'bg-blue-100 text-blue-900 border border-blue-200',
    dot: 'bg-blue-600',
    glow: 'shadow-blue-500/20',
  },
  EN_CONFECCION: {
    key: 'EN_CONFECCION',
    stepNumber: 2,
    label: '2- CONFECCIÓN',
    colorName: 'Ámbar',
    bgActive: 'bg-amber-500 text-slate-950 font-black shadow-sm ring-2 ring-amber-400/60',
    bgSubtle: 'bg-amber-50/95',
    bgCard: 'bg-amber-50/70 hover:bg-amber-100/80 border-amber-300 hover:border-amber-400',
    border: 'border-amber-400',
    borderAccent: 'border-amber-500',
    text: 'text-amber-950',
    textAccent: 'text-amber-800',
    badge: 'bg-amber-500 text-slate-950 font-black',
    tag: 'bg-amber-100 text-amber-950 border border-amber-300',
    dot: 'bg-amber-500',
    glow: 'shadow-amber-500/20',
  },
  EN_DISENO: {
    key: 'EN_DISENO',
    stepNumber: 3,
    label: '3- DISEÑO',
    colorName: 'Púrpura',
    bgActive: 'bg-purple-600 text-white shadow-sm ring-2 ring-purple-400/50',
    bgSubtle: 'bg-purple-50/90',
    bgCard: 'bg-purple-50/60 hover:bg-purple-100/70 border-purple-200 hover:border-purple-400',
    border: 'border-purple-300',
    borderAccent: 'border-purple-600',
    text: 'text-purple-950',
    textAccent: 'text-purple-700',
    badge: 'bg-purple-600 text-white',
    tag: 'bg-purple-100 text-purple-900 border border-purple-200',
    dot: 'bg-purple-600',
    glow: 'shadow-purple-500/20',
  },
  LISTO: {
    key: 'LISTO',
    stepNumber: 4,
    label: '4- LISTO',
    colorName: 'Verde',
    bgActive: 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-400/50',
    bgSubtle: 'bg-emerald-50/90',
    bgCard: 'bg-emerald-50/60 hover:bg-emerald-100/70 border-emerald-200 hover:border-emerald-400',
    border: 'border-emerald-400',
    borderAccent: 'border-emerald-600',
    text: 'text-emerald-950',
    textAccent: 'text-emerald-700',
    badge: 'bg-emerald-600 text-white',
    tag: 'bg-emerald-100 text-emerald-900 border border-emerald-300',
    dot: 'bg-emerald-600',
    glow: 'shadow-emerald-500/20',
  },
  ENTREGADO: {
    key: 'ENTREGADO',
    stepNumber: 5,
    label: '5- ENTREGADO',
    colorName: 'Teal',
    bgActive: 'bg-teal-700 text-white shadow-sm ring-2 ring-teal-400/50',
    bgSubtle: 'bg-teal-50/90',
    bgCard: 'bg-teal-50/60 hover:bg-teal-100/70 border-teal-200 hover:border-teal-400',
    border: 'border-teal-400',
    borderAccent: 'border-teal-700',
    text: 'text-teal-950',
    textAccent: 'text-teal-800',
    badge: 'bg-teal-700 text-white',
    tag: 'bg-teal-100 text-teal-900 border border-teal-300',
    dot: 'bg-teal-600',
    glow: 'shadow-teal-500/20',
  },
};

export const getWorkshopStatusTheme = (status?: WorkshopOrderStatus): StatusTheme => {
  const norm = normalizeWorkshopStatus(status || 'ACEPTADO');
  return WORKSHOP_STATUS_THEMES[norm] || WORKSHOP_STATUS_THEMES.ACEPTADO;
};

export const WORKSHOP_STEPS: {
  key: WorkshopOrderStatus;
  title: string;
  shortTitle: string;
  stepNumber: number;
  icon: React.ElementType;
}[] = [
  {
    key: 'ACEPTADO',
    title: '1- ACEPTADO',
    shortTitle: 'Aceptado',
    stepNumber: 1,
    icon: ShoppingCart,
  },
  {
    key: 'EN_CONFECCION',
    title: '2- CONFECCIÓN',
    shortTitle: 'Confección',
    stepNumber: 2,
    icon: Package,
  },
  {
    key: 'EN_DISENO',
    title: '3- DISEÑO',
    shortTitle: 'Diseño',
    stepNumber: 3,
    icon: Monitor,
  },
  {
    key: 'LISTO',
    title: '4- LISTO',
    shortTitle: 'Listo',
    stepNumber: 4,
    icon: Home,
  },
  {
    key: 'ENTREGADO',
    title: '5- ENTREGADO',
    shortTitle: 'Entregado',
    stepNumber: 5,
    icon: CheckCheck,
  },
];

export const normalizeWorkshopStatus = (status: WorkshopOrderStatus): WorkshopOrderStatus => {
  if (status === 'CONFIRMADO') return 'ACEPTADO';
  return status;
};

export const getWorkshopStepIndex = (status: WorkshopOrderStatus): number => {
  const norm = normalizeWorkshopStatus(status);
  const idx = WORKSHOP_STEPS.findIndex((s) => s.key === norm);
  return idx >= 0 ? idx : 0;
};

export const WorkshopTimeline: React.FC<WorkshopTimelineProps> = ({
  currentStatus,
  timeline,
  onSelectStep,
  interactive = true,
}) => {
  const normalizedCurrent = normalizeWorkshopStatus(currentStatus);
  const currentStepIndex = WORKSHOP_STEPS.findIndex((s) => s.key === normalizedCurrent);

  const getStepData = (stepKey: WorkshopOrderStatus) => {
    return timeline?.find(
      (t) => t.estado === stepKey || (stepKey === 'ACEPTADO' && t.estado === 'CONFIRMADO')
    );
  };

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-7 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 font-mono">
            Línea de Tiempo • Seguimiento del Pedido
          </span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
            {interactive ? 'Interactiva (Haz clic para cambiar estado)' : 'En Progreso'}
          </span>
        </div>
      </div>

      {/* Horizontal Progress Timeline */}
      <div className="relative w-full py-3 px-2 sm:px-6">
        <div className="flex items-start justify-between relative">
          {WORKSHOP_STEPS.map((step, index) => {
            const stepData = getStepData(step.key);
            const isPast = index < currentStepIndex;
            const isCurrent = index === currentStepIndex;
            const isFuture = index > currentStepIndex;

            const IconComponent = step.icon;

            // Connected line calculation
            const showRightLine = index < WORKSHOP_STEPS.length - 1;
            const isLineActive = index < currentStepIndex;

            return (
              <div
                key={step.key}
                className="relative flex flex-col items-center flex-1 group"
              >
                {/* Connecting Horizontal Line to the next step */}
                {showRightLine && (
                  <div
                    className={`absolute top-6 left-1/2 w-full h-[3.5px] -z-0 transition-colors duration-300 ${
                      isLineActive ? 'bg-blue-600' : 'bg-slate-200'
                    }`}
                  />
                )}

                {/* Circular Icon Node */}
                <button
                  type="button"
                  disabled={!interactive}
                  onClick={() => onSelectStep && onSelectStep(step.key)}
                  className={`relative z-10 w-12 h-12 sm:w-13 sm:h-13 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer ${
                    isCurrent
                      ? 'bg-blue-600 text-white ring-4 ring-blue-100 shadow-md scale-105'
                      : isPast
                      ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-xs'
                      : 'bg-slate-100 text-slate-400 hover:bg-slate-200 border-2 border-slate-200'
                  }`}
                  title={`${step.title} - ${isCurrent ? 'Estado Actual' : isPast ? 'Completado' : 'Pendiente'}`}
                >
                  <IconComponent className="w-5 h-5 sm:w-6 sm:h-6" />

                  {/* Corner Badge */}
                  {/* If completed (past or final delivered): Green circle with white check */}
                  {isPast && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs border-2 border-white">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}

                  {/* If current step: Blue pill/circle with step number */}
                  {isCurrent && (
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-blue-800 text-white text-[11px] font-black flex items-center justify-center shadow-xs border-2 border-white">
                      {step.stepNumber}
                    </span>
                  )}

                  {/* If pending/future step: Gray circle with step number */}
                  {isFuture && (
                    <span className="absolute -top-1 -right-1 w-4.5 h-4.5 rounded-full bg-slate-300 text-slate-600 text-[10px] font-bold flex items-center justify-center border-2 border-white">
                      {step.stepNumber}
                    </span>
                  )}
                </button>

                {/* Step Labels and Subtexts */}
                <div className="mt-3 text-center px-1 max-w-[130px] sm:max-w-[150px]">
                  <p
                    className={`text-[11px] sm:text-xs font-black tracking-tight uppercase leading-tight ${
                      isCurrent
                        ? 'text-slate-900 font-extrabold'
                        : isPast
                        ? 'text-slate-800'
                        : 'text-slate-400 font-bold'
                    }`}
                  >
                    {step.title}
                    {isCurrent && (
                      <span className="block text-[9.5px] font-bold text-blue-600 normal-case tracking-normal">
                        (Estado Actual)
                      </span>
                    )}
                  </p>

                  {/* Subtext with timestamp / tracking note */}
                  <div className="mt-1">
                    {stepData?.fecha ? (
                      <p
                        className={`text-[10.5px] sm:text-[11px] font-medium leading-tight ${
                          isCurrent
                            ? 'text-slate-700 font-semibold'
                            : isPast
                            ? 'text-slate-500'
                            : 'text-slate-400'
                        }`}
                      >
                        {stepData.fecha}
                      </p>
                    ) : (
                      <p className="text-[10px] text-slate-300 italic">
                        {isPast ? 'Completado' : 'Pendiente'}
                      </p>
                    )}

                    {/* Extended description (e.g. "Paquete salió del centro de distribución local" or workshop note) */}
                    {stepData?.descripcion && isCurrent && (
                      <p className="mt-1 text-[10px] sm:text-[10.5px] text-slate-600 font-medium bg-slate-50 border border-slate-200/80 rounded-md py-1 px-1.5 shadow-2xs leading-snug">
                        {stepData.descripcion}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

interface WorkshopDatalineBarProps {
  currentStatus: WorkshopOrderStatus;
  onSelectStep?: (status: WorkshopOrderStatus) => void;
  size?: 'sm' | 'md';
}

export const WorkshopDatalineBar: React.FC<WorkshopDatalineBarProps> = ({
  currentStatus,
  onSelectStep,
  size = 'md',
}) => {
  const normalizedCurrent = normalizeWorkshopStatus(currentStatus);
  const currentStepIndex = WORKSHOP_STEPS.findIndex((s) => s.key === normalizedCurrent);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-1 sm:gap-1.5 p-1 sm:p-1.5 bg-slate-100/90 rounded-xl border border-slate-200">
        {WORKSHOP_STEPS.map((step, index) => {
          const isCurrent = index === currentStepIndex;
          const isPast = index < currentStepIndex;
          const Icon = step.icon;
          const stepTheme = WORKSHOP_STATUS_THEMES[step.key];

          return (
            <button
              key={step.key}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onSelectStep) onSelectStep(step.key);
              }}
              title={`Paso ${step.stepNumber}: ${step.title} (${stepTheme.colorName})`}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-1 sm:px-2 rounded-lg text-[10px] sm:text-[11px] font-black tracking-tight transition-all cursor-pointer ${
                isCurrent
                  ? `${stepTheme.bgActive} scale-[1.03] shadow-md`
                  : isPast
                  ? 'bg-slate-200/80 text-slate-800 hover:bg-slate-300/80'
                  : 'bg-white/80 text-slate-500 hover:bg-white hover:text-slate-800 border border-slate-200/50'
              }`}
            >
              {isPast ? (
                <Check className="w-3 h-3 text-emerald-600 stroke-[3] shrink-0" />
              ) : (
                <Icon className={`w-3 h-3 shrink-0 ${isCurrent ? 'text-inherit' : 'text-slate-400'}`} />
              )}
              <span className="truncate">
                {step.stepNumber}- {step.shortTitle.toUpperCase()}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

