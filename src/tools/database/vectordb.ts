import { HuggingFaceTransformersEmbeddings } from "@langchain/community/embeddings/hf_transformers";
import { HNSWLib } from "@langchain/community/vectorstores/hnswlib";

const embeddings = new HuggingFaceTransformersEmbeddings({
  model: "Xenova/all-MiniLM-L6-v2",
});

const vectorStore = await HNSWLib.fromDocuments([], embeddings);

export { embeddings, vectorStore };
