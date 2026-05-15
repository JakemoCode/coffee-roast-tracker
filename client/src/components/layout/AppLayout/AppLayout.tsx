import { useEffect, useState } from "react";
import { Outlet, useNavigate, useSearchParams } from "react-router-dom";
import { useAuthState } from "../../../lib/useAuthState";
import { useLazyQuery, useMutation, useQuery } from "@apollo/client/react";
import { useTheme, useTempUnit } from "../../../providers/AppProviders";
import { Header } from "../Header";
import { UploadModal } from "../../modals/UploadModal";
import { useFlavorDescriptors } from "../../../lib/useFlavorDescriptors";
import {
  PREVIEW_ROAST_LOGS,
  UPLOAD_ROAST_LOG,
  CREATE_BEAN,
  MY_BEANS_QUERY,
  MY_ROASTS_QUERY,
  USER_SETTINGS_QUERY,
  UPDATE_TEMP_UNIT,
  UPDATE_THEME,
  UPDATE_PRIVACY_DEFAULT,
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
  const { descriptors: flavorList } = useFlavorDescriptors();

  // Distinct suppliers for AddBeanModal supplier combobox
  const { data: suppliersData } = useQuery(DISTINCT_SUPPLIERS_QUERY, { fetchPolicy: "cache-first" });
  const suppliers = suppliersData?.distinctSuppliers ?? [];

  // Upload mutations/queries
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

  async function handlePreviewFiles(
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
        onPreviewFiles={handlePreviewFiles}
        onUploadFile={handleUploadRoast}
        beans={beans}
        onCreateBean={handleCreateBean}
        flavors={flavorList}
        suppliers={suppliers}
        onComplete={(result) => {
          setUploadOpen(false);
          if (result.mode === "single") {
            navigate(`/roasts/${result.roastId}`);
          } else {
            navigate("/");
          }
        }}
      />
    </div>
  );
}
