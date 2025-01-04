<script setup lang="ts">
import { Ref, ref } from "vue"
import { marked } from "marked"
import {
  IconCheckCircle,
  IconDownload,
  IconGithubCircle
} from "@iconify-prerendered/vue-mdi"

const imageName: Ref<{
  base: string | undefined
  developer: string | undefined
  gpu: string | undefined
  stream: string | undefined
}> = ref({
  base: "bluefin",
  developer: undefined,
  gpu: undefined,
  stream: undefined
})

const getFormattedImageName = () => {
  let final_name = imageName.value.base

  if (imageName.value.developer) {
    final_name += "-dx"
  }

  if (imageName.value.gpu === "nvidia") {
    final_name += "-nvidia"
  }

  switch (imageName.value.stream) {
    case "latest":
//  case "gts": 
      final_name += "-"+imageName.value.stream
      break;
    default:
      final_name += "-stable";
  }

  return final_name
}

const BLUEFIN_DOWNLOAD_URL = "https://download.projectbluefin.io/%TEMPLATE%"

import { useI18n } from "vue-i18n"
import type { MessageSchema } from "../locales/schema"
const { t } = useI18n<MessageSchema>({
  useScope: "global"
})
</script>

// Ofc this is inneficient, but its much better than the old solution.
<style scoped>
@tailwind base;
@tailwind components;
@tailwind utilities;

.question-select {
  @apply rounded-xl bg-black p-5 text-white w-full xl:w-full xl:max-w-xl border-blue-500 border-s-8;
}
.question-container {
  @apply my-7 w-full;
}
.question-title {
  @apply mb-2 text-white text-2xl;
}
#downloadtexts a {
  color: #FFFFFF !important;
}
</style>


<template>
  <div
    class="flex pt-20 flex-wrap xl:flex-nowrap font-inter w-full xl:w-auto text-[11pt]"
  >
    <form autocomplete="off" class="container-xl w-full">
      <Transition name="fade">
        <div
          class="gpu question-container"
        >
          <label for="gpuVendor" class="question-title">{{
            t("TryBluefin.Gpu.Question")
          }}</label>
          <div>
            <select
              v-model="imageName.gpu"
              id="gpuVendor"
              name="gpuVendor"
              class="question-select"
            >
              <option :value="undefined" disabled selected>
                {{ t("TryBluefin.Gpu.DefaultSelection") }}
              </option>
              <option :value="'amd'">AMD</option>
              <option :value="'nvidia'">Nvidia (GeForce 10 Series+)</option>
              <option :value="'intel'">Intel</option>
            </select>
          </div>
        </div>
      </Transition>

      <Transition name="fade">
        <div 
          class="question-container"
          v-if="imageName.gpu != undefined"
        >
          <label for="isDeveloper" class="question-title">{{
            t("TryBluefin.Developer.Question")
          }}</label>
          <div>
            <select
              v-model="imageName.developer"
              id="isDeveloper"
              name="isDeveloper"
              class="question-select"
            >
              <option :value="undefined" disabled selected>
                {{ t("TryBluefin.Developer.DefaultSelection") }}
              </option>
              <option :value="true">{{ t("TryBluefin.Developer.Yes") }}</option>
              <option :value="false">{{ t("TryBluefin.Developer.No") }}</option>
            </select>
          </div>
        </div>
      </Transition>
      <Transition name="fade">
        <div class="question-container" v-if="imageName.developer != undefined">
          <label for="isGts" class="question-title">{{
            t("TryBluefin.Stream.Question")
          }}</label>
          <div class="select">
            <select
              v-model="imageName.stream"
              id="isGts"
              name="isGts"
              class="question-select"
            >
              <option disabled selected :value="undefined">
                {{ t("TryBluefin.Stream.DefaultSelection") }}
              </option>
              <!-- <option :value="'gts'">
                {{ t("TryBluefin.Stream.Gts", { version: "40" }) }} -->
              </option>
              <option :value="'stable'">
                {{ t("TryBluefin.Stream.Stable", { version: "41" }) }}
              </option>
              <!-- Do not add Latest, it is way too unstable for new users -->
            </select>
          </div>
        </div>
      </Transition>
    </form>

    <Transition name="fade">
      <div
        v-if="
          imageName.developer != undefined &&
          imageName.gpu != undefined &&
          imageName.stream != undefined
        "
        class="w-full mt-20 xl:m-auto container-xl justify-center flex flex-col text-white items-center xl:items-start xl:justify-left"
      >
        <div class="flex flex-row items-center" id="downloadtexts">
          <a
            class="bg-blue-500 rounded-3xl p-4 my-10 max-w-md flex flex-row flex-nowrap justify-center grow items-center"
            :href="
              BLUEFIN_DOWNLOAD_URL.replace(
                '%TEMPLATE%',
                (getFormattedImageName() ?? '') + '.iso'
              )
            "
          >
            {{
              t("TryBluefin.Download.Iso", {
                isoname: getFormattedImageName()?.replace("-stable", "") ?? ""
              })
            }}
            <IconDownload class="w-[2rem] h-[2rem] shrink grow-0" />
          </a>
          <a
            class="px-3"
            :title="t('TryBluefin.Download.Checksum')"
            :href="
              BLUEFIN_DOWNLOAD_URL.replace(
                '%TEMPLATE%',
                (getFormattedImageName() ?? '') + '.iso-CHECKSUM'
              )
            "
          >
            <IconCheckCircle class="w-[3rem] h-[3rem]" />
          </a>
          <a
            :title="t('TryBluefin.Download.Registry')"
            href="https://github.com/orgs/ublue-os/packages?repo_name=bluefin"
            target="_blank"
          >
            <IconGithubCircle class="w-[3rem] h-[3rem]" />
          </a>
        </div>

        <p v-html="marked.parse(t('TryBluefin.Download.DocumentationURL'))" />
        <p
          v-if="imageName.developer"
          v-html="marked.parse(t('TryBluefin.Download.DeveloperNote'))"
        />

        <img
          class="dolly"
          :src="'./characters/dolly.webp'"
          :title="t('TryBluefin.Download.DollyChill')"
        />
      </div>
    </Transition>
  </div>
</template>
