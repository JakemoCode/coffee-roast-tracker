import { useEffect, useState } from "react";
import { Outlet, useNavigate, useSearchParams } from "react-router-dom";
import { useAuthState } from "../../../lib/useAuthState";
import { useLazyQuery, useMutation, useQuery } from "@apollo/client/react";
import { useTheme, useTempUnit } from "../../../providers/AppProviders";
import { Header } from "../Header";
import { UploadModal } from "../../modals/UploadModal";
import {
  PREVIEW_ROAST_LOG,
  PREVIEW_ROAST_LOGS,
  UPLOAD_ROAST_LOG,
  CREATE_BEAN,
  MY_BEANS_QUERY,
  MY_ROASTS_QUERY,
  USER_SETTINGS_QUERY,
  UPDATE_TEMP_UNIT,
  UPDATE_THEME,
  UPDATE_PRIVACY_DEFAULT,
  FLAVOR_DESCRIPTORS_QUERY,
  DISTINCT_SUPPLIERS_QUERY,
} from "../../../graphql/operations";
import styles from "./AppLayout.module.css";

export function AppLayout() {
  const navigate = useNavigate();
  const { isSignedIn, signOut } = useAuthState();
  const isAuthenticated = !!isSignedIn;

  const { theme, toggleTheme } = useTheme();
  const { tempUnit, toggleTempUnit } = useTempUnit();

  const [searchParams, setSearchParams] = useSearchParams();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [privateByDefault, setPrivateByDefault] = useState(false);

  // ?upload=true deep-link opens the upload modal (e.g. empty-state CTA)
  useEffect(() => {
    if (searchParams.get("upload") === "true" && isAuthenticated) {
      setUploadOpen(true);
      searchParams.delete("upload");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, isAuthenticated, setSearchParams]);

  // Fetch user settings when authenticated
  const { data: settingsData } = useQuery(USER_SETTINGS_QUERY, {
    skip: !isAuthenticated,
  });

  useEffect(() => {
    if (settingsData?.userSettings) {
      const settings = settingsData.userSettings;
      setPrivateByDefault(settings.privateByDefault);
    }
  }, [settingsData]);

  // Beans for upload modal
  const { data: beansData } = useQuery(MY_BEANS_QUERY, {
    skip: !isAuthenticated,
  });

  const beans =
    beansData?.myBeans?.map((ub) => ({
      id: ub.bean.id,
      name: ub.bean.name,
    })) ?? [];

  // Flavor descriptors for AddBeanModal flavor parsing
  const { data: flavorData } = useQuery(FLAVOR_DESCRIPTORS_QUERY);
  const flavorList = (flavorData?.flavorDescriptors ?? []).map((f: { name: string; color: string }) => ({
    name: f.name,
    color: f.color,
  }));

  // Distinct suppliers for AddBeanModal supplier combobox
  const { data: suppliersData } = useQuery(DISTINCT_SUPPLIERS_QUERY, { fetchPolicy: "cache-first" });
  const suppliers = suppliersData?.distinctSuppliers ?? [];

  // Upload mutations/queries
  const [previewRoastLog] = useLazyQuery(PREVIEW_ROAST_LOG);
  const [uploadRoastLog] = useMutation(UPLOAD_ROAST_LOG, {
    refetchQueries: [{ query: MY_ROASTS_QUERY }],
  });
  const [createBean] = useMutation(CREATE_BEAN, {
    refetchQueries: [{ query: MY_BEANS_QUERY }, { query: DISTINCT_SUPPLIERS_QUERY }],
  });

  // Setting mutations
  const [updateTempUnit] = useMutation(UPDATE_TEMP_UNIT);
  const [updateTheme] = useMutation(UPDATE_THEME);
  const [updatePrivacyDefault] = useMutation(UPDATE_PRIVACY_DEFAULT);

  const [previewRoastLogs] = useLazyQuery(PREVIEW_ROAST_LOGS);

  async function handlePreview(fileName: string, fileContent: string) {
    const { data } = await previewRoastLog({
      variables: { fileName, fileContent },
    });
    if (!data?.previewRoastLog) {
      throw new Error("Failed to preview roast log");
    }
    return data.previewRoastLog;
  }

  async function handlePreviewBatch(
    files: Array<{ fileName: string; fileContent: string }>,
  ) {
    const { data } = await previewRoastLogs({
      variables: { files },
    });
    if (!data?.previewRoastLogs) {
      throw new Error("Failed to preview roast logs");
    }
    return data.previewRoastLogs.map((r) => ({
      fileName: r.fileName,
      preview: r.preview ?? null,
      error: r.error ?? null,
    }));
  }

  async function handleUploadRoast(
    beanId: string,
    fileName: string,
    fileContent: string,
    notes?: string,
  ) {
    const { data } = await uploadRoastLog({
      variables: { beanId, fileName, fileContent, notes },
    });
    if (!data?.uploadRoastLog?.roast?.id) {
      throw new Error("Failed to save roast log");
    }
    return {
      roastId: data.uploadRoastLog.roast.id,
      wasDuplicate: data.uploadRoastLog.wasDuplicate,
    };
  }

  async function handleSave(
    beanId: string,
    fileName: string,
    fileContent: string,
    notes?: string,
  ) {
    const result = await handleUploadRoast(beanId, fileName, fileContent, notes);
    navigate(`/roasts/${result.roastId}`);
    return result;
  }

  async function handleCreateBean(bean: {
    name: string;
    origin: string;
    process: string;
    [key: string]: unknown;
  }) {
    const { data } = await createBean({
      variables: { input: bean },
    });
    if (!data?.createBean?.bean) {
      throw new Error("Failed to create bean");
    }
    return { id: data.createBean.bean.id, name: data.createBean.bean.name };
  }

  function handleToggleTempUnit() {
    toggleTempUnit();
    if (isAuthenticated) {
      const next = tempUnit === "CELSIUS" ? "FAHRENHEIT" : "CELSIUS";
      updateTempUnit({ variables: { tempUnit: next } });
    }
  }

  function handleToggleTheme() {
    toggleTheme();
    if (isAuthenticated) {
      const next = theme === "light" ? "dark" : "light";
      updateTheme({ variables: { theme: next } });
    }
  }

  function handleTogglePrivacyDefault() {
    const next = !privateByDefault;
    setPrivateByDefault(next);
    if (isAuthenticated) {
      updatePrivacyDefault({ variables: { privateByDefault: next } });
    }
  }

  return (
    <div className={styles.layout} data-testid="app-layout">
      <Header
        isAuthenticated={isAuthenticated}
        tempUnit={tempUnit}
        onToggleTempUnit={handleToggleTempUnit}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        privateByDefault={privateByDefault}
        onTogglePrivacyDefault={handleTogglePrivacyDefault}
        onSignOut={signOut}
        onUploadOpen={() => setUploadOpen(true)}
      />
      <main className={styles.main} inert={uploadOpen || undefined}>
        <Outlet />
      </main>
      <UploadModal
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onPreview={handlePreview}
        onPreviewBatch={handlePreviewBatch}
        onSave={handleSave}
        onSaveBatch={handleUploadRoast}
        beans={beans}
        onCreateBean={handleCreateBean}
        flavors={flavorList}
        suppliers={suppliers}
        onBatchComplete={() => {
          setUploadOpen(false);
          navigate("/");
        }}
      />
    </div>
  );
}
