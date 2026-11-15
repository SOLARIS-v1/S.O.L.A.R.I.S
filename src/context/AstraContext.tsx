/**
 * Backward compatibility re-export.
 * All state is consolidated into authoritative SolarisContext.tsx.
 */
export * from './SolarisContext';
export {
  SolarisProvider as AstraProvider,
  useSolaris as useAstra,
  SolarisContext as AstraContext,
} from './SolarisContext';
