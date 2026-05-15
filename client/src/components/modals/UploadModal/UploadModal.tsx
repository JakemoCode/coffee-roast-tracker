import { useRef, useState, useMemo, useEffect } from "react";
import { useQuery } from "@apollo/client/react";
import { Modal } from "../Modal";
import { Combobox } from "../../Combobox";
import { AddBeanModal } from "../AddBeanModal";
import { BatchUploadTable } from "../../tables/BatchUploadTable";
import type { BatchRow } from "../../tables/BatchUploadTable";
import { formatDuration } from "../../../lib/formatters";
import { PUBLIC_BEANS_QUERY } from "../../../graphql/operations";
import { ROAST_PREVIEW_FIELDS } from "./RoastPreviewFragment";
import type { FragmentOf } from "../../../graphql/graphql";
import styles from "./UploadModal.module.css";

const PUBLIC_BEAN_SEARCH_LIMIT = 500;

const MAX_FILES = 20;

type RoastPreview = FragmentOf<typeof ROAST_PREVIEW_FIELDS>;
type CommunityBean = RoastPreview["communityBeans"][number];

export type UploadCompleteResult =
  | { mode: "single"; roastId: string; wasDuplicate: boolean }
  | { mode: "batch"; savedCount: number; duplicateCount: number };

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPreviewFiles: (
    files: Array<{ fileName: string; fileContent: string }>,
  ) => Promise<
    Array<{
      fileName: string;
      preview: RoastPreview | null;
      error: string | null;
    }>
  >;
  onUploadFile: (
    beanId: string,
    fileName: string,
    fileContent: string,
    notes?: string,
  ) => Promise<{ roastId: string; wasDuplicate: boolean }>;
  beans: Array<{ id: string; name: string }>;
  onCreateBean: (bean: {
    name: string;
    origin: string;
    process: string;
    [key: string]: unknown;
  }) => Promise<{ id: string; name: string }>;
  flavors?: Array<{ name: string; color: string }>;
  suppliers?: string[];
  onComplete?: (result: UploadCompleteResult) => void;
}

export function UploadModal({
  isOpen,
  onClose,
  onPreviewFiles,
  onUploadFile,
  beans,
  onCreateBean,
  flavors,
  suppliers,
  onComplete,
}: UploadModalProps) {
  const [step, setStep] = useState<"dropzone" | "preview">("dropzone");
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState("");
  const [fileContent, setFileContent] = useState("");
  const [preview, setPreview] = useState<RoastPreview | null>(null);
  const [selectedBeanId, setSelectedBeanId] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [addBeanOpen, setAddBeanOpen] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [mode, setMode] = useState<"single" | "batch">("single");
  const [batchRows, setBatchRows] = useState<BatchRow[]>([]);
  const [batchSaving, setBatchSaving] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);
  const [skippedFiles, setSkippedFiles] = useState(0);
  const [batchBeanId, setBatchBeanId] = useState("");
  const [batchBeanMode, setBatchBeanMode] = useState<"match" | "select" | "new">("match");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setStep("dropzone");
    setIsDragging(false);
    setFileName("");
    setFileContent("");
    setPreview(null);
    setSelectedBeanId("");
    setNotes("");
    setError("");
    setSaving(false);
    setParsing(false);
    setAddBeanOpen(false);
    setMode("single");
    setBatchRows([]);
    setBatchSaving(false);
    setBatchProgress(null);
    setSkippedFiles(0);
    setBatchBeanId("");
    setBatchBeanMode("match");
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleFileRead(name: string, content: string) {
    setFileName(name);
    setFileContent(content);
    setError("");
    setParsing(true);

    try {
      const [entry] = await onPreviewFiles([
        { fileName: name, fileContent: content },
      ]);
      if (!entry || entry.error || !entry.preview) {
        throw new Error(entry?.error ?? "Failed to parse file");
      }
      const result = entry.preview;
      setPreview(result);
      // Auto-select priority: user library first, community catalog second
      const librarySuggestion = result.suggestedBeans[0];
      const communitySuggestion = result.communityBeans?.[0];
      if (librarySuggestion) {
        setSelectedBeanId(librarySuggestion.bean.id);
      } else if (communitySuggestion) {
        setSelectedBeanId(communitySuggestion.id);
      }
      setStep("preview");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to parse file";
      setError(message);
    } finally {
      setParsing(false);
    }
  }

  function handleFile(file: File) {
    if (!file.name.endsWith(".klog")) {
      setError("Only .klog files are supported. Please select a Kaffelogic roast file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      handleFileRead(file.name, content);
    };
    reader.readAsText(file);
  }

  async function handleMultipleFiles(files: File[]) {
    const klogFiles = files.filter((f) => f.name.endsWith(".klog"));
    const skipped = files.length - klogFiles.length;
    setSkippedFiles(skipped);

    if (klogFiles.length === 0) {
      setError("No .klog files found. Only Kaffelogic roast files are supported.");
      return;
    }

    if (klogFiles.length === 1) {
      handleFile(klogFiles[0]!);
      return;
    }

    if (klogFiles.length > MAX_FILES) {
      setError(`Too many files. Upload up to ${MAX_FILES} at a time.`);
      return;
    }

    setMode("batch");
    setParsing(true);

    // Read all files
    const fileData = await Promise.all(
      klogFiles.map(
        (f) =>
          new Promise<{ name: string; content: string }>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) =>
              resolve({ name: f.name, content: e.target?.result as string });
            reader.onerror = () =>
              reject(new Error(`Failed to read ${f.name}`));
            reader.readAsText(f);
          }),
      ),
    );

    let results;
    try {
      results = await onPreviewFiles(
        fileData.map(({ name, content }) => ({ fileName: name, fileContent: content })),
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to parse files";
      setError(message);
      setParsing(false);
      setMode("single");
      return;
    }

    const rows: BatchRow[] = results.map((r) => {
      const fd = fileData.find((f) => f.name === r.fileName);
      return {
        fileName: r.fileName,
        fileContent: fd?.content ?? "",
        preview: r.preview,
        error: r.error,
        saved: false,
        isDuplicate: Boolean(r.preview?.existingRoastId),
      };
    });

    setBatchRows(rows);
    setParsing(false);
  }

  async function handleSaveAll() {
    const validIndices = batchRows
      .map((r, i) => (!r.error && !r.saved ? i : -1))
      .filter((i) => i >= 0);
    setBatchSaving(true);
    setBatchProgress({ current: 0, total: validIndices.length });

    let savedCount = 0;
    let duplicateCount = 0;
    for (let i = 0; i < validIndices.length; i++) {
      const rowIndex = validIndices[i]!;
      const row = batchRows[rowIndex]!;
      setBatchProgress({ current: i + 1, total: validIndices.length });
      try {
        const result = await onUploadFile(batchBeanId, row.fileName, row.fileContent);
        savedCount += 1;
        if (result.wasDuplicate || row.isDuplicate) duplicateCount += 1;
        setBatchRows((prev) =>
          prev.map((r, idx) =>
            idx === rowIndex
              ? { ...r, saved: true, isDuplicate: r.isDuplicate || result.wasDuplicate }
              : r,
          ),
        );
      } catch {
        setError(`Failed to save ${row.fileName}. Previously saved roasts are safe.`);
        setBatchSaving(false);
        setBatchProgress(null);
        return;
      }
    }

    // All saved — reset before unmounting to avoid stale state setters
    reset();
    onComplete?.({ mode: "batch", savedCount, duplicateCount });
    onClose();
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 1) {
      handleMultipleFiles(files);
    } else if (files[0]) {
      handleFile(files[0]);
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 1) {
      handleMultipleFiles(files);
    } else if (files[0]) {
      handleFile(files[0]);
    }
  }

  async function saveRoast(beanId: string) {
    setSaving(true);
    setError("");
    try {
      const result = await onUploadFile(beanId, fileName, fileContent, notes || undefined);
      onComplete?.({
        mode: "single",
        roastId: result.roastId,
        wasDuplicate: result.wasDuplicate,
      });
      onClose();
      reset();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save roast";
      setError(message);
      setSaving(false);
    }
  }

  async function handleSave() {
    if (!selectedBeanId || !fileName) return;
    await saveRoast(selectedBeanId);
  }

  async function handleCreateBean(bean: {
    name: string;
    origin: string;
    process: string;
    [key: string]: unknown;
  }) {
    const created = await onCreateBean(bean);
    setAddBeanOpen(false);

    if (mode === "single") {
      setSelectedBeanId(created.id);
      // Auto-save the roast with the newly created bean
      if (fileName && fileContent) {
        await saveRoast(created.id);
      }
    } else {
      // Batch mode: set the new bean as the selected bean for all rows
      setBatchBeanId(created.id);
      setBatchBeanMode("new");
    }
  }

  // Library options first, then any community-catalog matches from this
  // file's preview that the user doesn't already have, then the full public
  // catalog so users can search for any community bean. Community entries
  // are labeled so users know selecting one will add it to their library on
  // save.
  const libraryBeanIds = useMemo(() => new Set(beans.map((b) => b.id)), [beans]);
  // Defensive — older test fixtures may omit communityBeans
  const batchCommunityBeans: CommunityBean[] = useMemo(() => {
    const seen = new Map<string, CommunityBean>();
    for (const row of batchRows) {
      if (!row.preview) continue;
      for (const cb of row.preview.communityBeans ?? []) {
        if (!libraryBeanIds.has(cb.id)) seen.set(cb.id, cb);
      }
    }
    return [...seen.values()];
  }, [batchRows, libraryBeanIds]);
  const activeCommunityBeans =
    mode === "batch" ? batchCommunityBeans : (preview?.communityBeans ?? []);

  const { data: publicBeansData } = useQuery(PUBLIC_BEANS_QUERY, {
    variables: { limit: PUBLIC_BEAN_SEARCH_LIMIT },
    skip: !isOpen,
    fetchPolicy: "cache-first",
  });
  const publicBeanPool: CommunityBean[] = useMemo(
    () =>
      (publicBeansData?.publicBeans ?? []).map((b) => ({
        id: b.id,
        name: b.name,
      })),
    [publicBeansData],
  );

  const searchableCommunityBeans: CommunityBean[] = useMemo(() => {
    const seen = new Map<string, CommunityBean>();
    for (const cb of activeCommunityBeans) {
      if (!libraryBeanIds.has(cb.id)) seen.set(cb.id, cb);
    }
    for (const cb of publicBeanPool) {
      if (!libraryBeanIds.has(cb.id) && !seen.has(cb.id)) seen.set(cb.id, cb);
    }
    return [...seen.values()];
  }, [activeCommunityBeans, publicBeanPool, libraryBeanIds]);

  const beanOptions = [
    ...beans.map((b) => ({ value: b.id, label: b.name })),
    ...searchableCommunityBeans.map((cb) => ({
      value: cb.id,
      label: `${cb.name} \u2022 community`,
    })),
  ];

  // Anything selected that isn't in the user's library is — by construction
  // of beanOptions — a community bean. No need to re-check pool membership.
  function isCommunityBean(id: string): boolean {
    return id !== "" && !libraryBeanIds.has(id);
  }
  const isCommunitySelection = isCommunityBean(selectedBeanId);
  const isBatchCommunitySelection = isCommunityBean(batchBeanId);

  const autoMatchedBean = useMemo(() => {
    if (batchRows.length === 0) return null;

    function tallyTop(getBeans: (row: BatchRow) => Array<{ id: string; name: string }>) {
      const counts = new Map<string, { id: string; name: string; count: number }>();
      for (const row of batchRows) {
        if (!row.preview) continue;
        for (const b of getBeans(row)) {
          const existing = counts.get(b.id);
          if (existing) existing.count++;
          else counts.set(b.id, { id: b.id, name: b.name, count: 1 });
        }
      }
      if (counts.size === 0) return null;
      return [...counts.values()].sort((a, b) => b.count - a.count)[0] ?? null;
    }

    // Prefer library matches; fall back to community matches
    return (
      tallyTop((row) => row.preview!.suggestedBeans.map((sb) => sb.bean)) ??
      tallyTop((row) => row.preview!.communityBeans ?? [])
    );
  }, [batchRows]);

  // When auto-match is found and the user hasn't switched off "match" mode,
  // adopt it as the selected bean. useEffect — this is a side effect, not a
  // memoized value; React's compiler may skip pure-looking memos.
  useEffect(() => {
    if (autoMatchedBean && batchBeanMode === "match" && batchBeanId !== autoMatchedBean.id) {
      setBatchBeanId(autoMatchedBean.id);
    }
  }, [autoMatchedBean, batchBeanMode, batchBeanId]);

  if (mode === "batch") {
    return (
      <>
        <Modal
          isOpen={isOpen}
          onClose={handleClose}
          title={`Upload Roasts (${batchRows.filter((r) => !r.error).length} files)`}
          wide
        >
          {parsing ? (
            <div className={styles.dropzone} data-testid="parsing-indicator">
              <p className={styles.dropText}>Parsing files…</p>
            </div>
          ) : (
            <>
              {skippedFiles > 0 && (
                <div className={styles.warningBar} data-testid="skipped-warning">
                  Skipped {skippedFiles} non-.klog file{skippedFiles > 1 ? "s" : ""}
                </div>
              )}

              <div className={styles.beanSelectionSection}>
                <div className={styles.metaLabel}>Bean for all roasts</div>

                <div className={styles.radioGroup}>
                  {autoMatchedBean && (
                    <label className={styles.radioLabel}>
                      <input
                        type="radio"
                        name="batchBean"
                        value="match"
                        checked={batchBeanMode === "match"}
                        onChange={() => {
                          setBatchBeanMode("match");
                          setBatchBeanId(autoMatchedBean.id);
                        }}
                      />
                      {autoMatchedBean.name}
                    </label>
                  )}

                  <label className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="batchBean"
                      value="select"
                      checked={batchBeanMode === "select"}
                      onChange={() => setBatchBeanMode("select")}
                    />
                    Select a bean
                  </label>

                  {batchBeanMode === "select" && (
                    <div className={styles.beanComboboxWrapper}>
                      <Combobox
                        options={beanOptions}
                        value={batchBeanId}
                        onChange={setBatchBeanId}
                        placeholder="Search beans..."
                      />
                    </div>
                  )}

                  <label className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="batchBean"
                      value="new"
                      checked={batchBeanMode === "new"}
                      onChange={() => {
                        setBatchBeanMode("new");
                        setAddBeanOpen(true);
                      }}
                    />
                    Add New Bean
                  </label>
                </div>

                {batchBeanId ? (
                  <>
                    <div className={styles.beanConfirmation}>
                      Selected: <strong>{beanOptions.find((b) => b.value === batchBeanId)?.label ?? batchBeanId}</strong>
                    </div>
                    {isBatchCommunitySelection && (
                      <div className={styles.communityNote} data-testid="community-selection-note-batch">
                        Will be added to your library on save
                      </div>
                    )}
                  </>
                ) : (
                  <div className={styles.beanPending}>
                    No bean selected
                  </div>
                )}
              </div>

              <BatchUploadTable
                rows={batchRows}
                selectedBeanName={beanOptions.find((b) => b.value === batchBeanId)?.label}
                onSaveAll={handleSaveAll}
                saving={batchSaving}
                saveProgress={batchProgress}
                canSave={!!batchBeanId && !batchSaving}
              />
              {error && (
                <div className={styles.errorMessage} data-testid="save-error">
                  {error}
                </div>
              )}
            </>
          )}
        </Modal>

        <AddBeanModal
          isOpen={addBeanOpen}
          onClose={() => setAddBeanOpen(false)}
          onSave={handleCreateBean}
          flavors={flavors}
          suppliers={suppliers}
          minimal
        />
      </>
    );
  }

  if (step === "dropzone") {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title="New Roast Upload">
        {parsing ? (
          <div className={styles.dropzone} data-testid="parsing-indicator">
            <p className={styles.dropText}>Parsing {fileName}…</p>
          </div>
        ) : (
          <div
            className={`${styles.dropzone} ${isDragging ? styles.dropzoneDragging : ""}`}
            data-testid="dropzone"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <p className={styles.dropText}>Drop your .klog files to upload roast data</p>
            <p className={styles.dropHint}>Upload a single roast or multiple logs for the same bean</p>
            <p>
              <span className={styles.browseLink}>or browse files</span>
            </p>
            <p className={styles.dropHint}>Up to {MAX_FILES} files at once</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".klog"
              multiple
              style={{ display: "none" }}
              onChange={handleInputChange}
              data-testid="file-input"
            />
          </div>
        )}
        {error && (
          <div className={styles.errorMessage} data-testid="upload-error">
            {error}
          </div>
        )}
      </Modal>
    );
  }

  const footer = addBeanOpen ? undefined : (
    <>
      <button
        type="button"
        className={`${styles.btn} ${styles.btnSecondary}`}
        onClick={handleClose}
      >
        Cancel
      </button>
      <button
        type="button"
        className={`${styles.btn} ${styles.btnPrimary}`}
        onClick={handleSave}
        disabled={!selectedBeanId || saving}
        title={!selectedBeanId ? "Select a bean first" : undefined}
      >
        {saving ? "Saving\u2026" : "Save Roast"}
      </button>
    </>
  );

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="New Roast Upload"
        footer={footer}
      >
        <div className={styles.fileInfo}>
          <span className={styles.fileName}>{fileName}</span>
          <span className={styles.parseSuccess}>Parsed successfully</span>
        </div>

        {preview && (
          <>
            <div className={styles.metadataGrid}>
              <div>
                <div className={styles.metaLabel}>Roast Date</div>
                <div className={styles.metaValue}>
                  {preview.roastDate
                    ? new Date(preview.roastDate).toLocaleDateString()
                    : "\u2014"}
                </div>
              </div>
              <div>
                <div className={styles.metaLabel}>Duration</div>
                <div className={styles.metaValue}>
                  {formatDuration(preview.totalDuration)}
                </div>
              </div>
              <div>
                <div className={styles.metaLabel}>Profile</div>
                <div className={styles.metaValue}>
                  {preview.profileShortName ?? "\u2014"}
                </div>
              </div>
              <div>
                <div className={styles.metaLabel}>Development %</div>
                <div className={styles.metaValue}>
                  {preview.developmentPercent != null
                    ? `${preview.developmentPercent.toFixed(1)}%`
                    : "\u2014"}
                </div>
              </div>
            </div>

            {preview.parseWarnings.length > 0 && (
              <div className={styles.warningBar} data-testid="parse-warnings">
                <ul className={styles.warningList}>
                  {preview.parseWarnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {preview.suggestedBeans.length > 0 ? (
              <div
                className={`${styles.matchBanner} ${styles.matchFound}`}
                data-testid="bean-match-found"
              >
                Bean match found: {preview.suggestedBeans[0]?.bean.name}
              </div>
            ) : (preview.communityBeans?.length ?? 0) > 0 ? (
              <div
                className={`${styles.matchBanner} ${styles.matchFound}`}
                data-testid="community-bean-match-found"
              >
                Community match: {preview.communityBeans?.[0]?.name}
                <span className={styles.matchDetail}>
                  {" "}— will be added to your library on save
                </span>
              </div>
            ) : (
              <div
                className={`${styles.matchBanner} ${styles.noMatch}`}
                data-testid="no-bean-match"
              >
                <button
                  type="button"
                  className={styles.addBeanLink}
                  onClick={() => setAddBeanOpen(true)}
                >
                  No bean match — Add new bean
                </button>
              </div>
            )}
          </>
        )}

        <div className={styles.beanSection}>
          <div className={styles.metaLabel}>Bean</div>
          <Combobox
            options={beanOptions}
            value={selectedBeanId}
            onChange={setSelectedBeanId}
            placeholder="Select a bean..."
          />
          {isCommunitySelection && (
            <div className={styles.communityNote} data-testid="community-selection-note">
              Will be added to your library on save
            </div>
          )}
          {(preview?.suggestedBeans.length ?? 0) > 0 && (
            <button
              type="button"
              className={styles.addBeanLink}
              onClick={() => setAddBeanOpen(true)}
            >
              + Add new bean
            </button>
          )}
        </div>

        <div>
          <div className={styles.metaLabel}>Notes</div>
          <textarea
            className={styles.notesTextarea}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes about this roast..."
            rows={3}
            data-testid="notes-input"
          />
        </div>

        {error && (
          <div className={styles.errorMessage} data-testid="save-error">
            {error}
          </div>
        )}
      </Modal>

      <AddBeanModal
        isOpen={addBeanOpen}
        onClose={() => setAddBeanOpen(false)}
        onSave={handleCreateBean}
        flavors={flavors}
        suppliers={suppliers}
        minimal
      />
    </>
  );
}
