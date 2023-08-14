<script setup lang='ts'>
import FaqItem from '../FaqItem.vue'
import SceneContent from '../common/SceneContent.vue'
import SceneVisibilityChecker from '../common/SceneVisibilityChecker.vue'

const content = `
If your questions remain unanswered, 
you can reach us at [jorge@bluefin.com](jorge@bluefin.com).
`

// Questions
const questionOne = {
  question: 'What is this exactly? Why did you make a Linux distribution?',
  answer: ' Blufin uses Fedora’s OCI deployment feature to decouple the system image from configuration. This allows for customization similar to a configuration management tool such as Ansible or Salt without the usual problems associated with custom distributions. All of Bluefin and universal blue are open source and signed by cosign. It’s more akin to having someone install Fedora for you and set it up “the right way”. \n\n What is a cloud native model? \n\n [Check it out on YouTube](https://youtu.be/p-88GN1WVs8)',
  open: true,
}

const questionTwo = {
  question: 'Where can I find more details on the features?',
  answer: 'You can find detailed information in our Github repository. \n\n [Visit Github](https://github.com/ublue-os/bluefin#readme)',
}

const questionThree = {
  question: 'What if I want something like KDE or another window manager?',
  answer: 'Bluefin is an opinionated GNOME experience. However Universal Blue provides a maintained set of base images for anyone to be able to make their own custom image. We hope Bluefin acts as an inspiration for others to build their own communities around user experiences. For example check out Bazzite if you want a great KDE gaming experience, similar to SteamOS',
}

const questionFour = {
  question: 'What do the -framework images do?',
  answer: 'These follow Framework’s recommendations to swap out gnome-power-profile with tlp. The recommended settings are shipped, but allow for user-overridden configuration. We hope the framework community can help us ship a good set of configs that would allow for quick testing of battery settings so we can maintain it long term.',
}

const questionFive = {
  question: 'How do I change my shell?',
  answer: '`just zsh` or `just fish` will prompt you to switch your shell. Type `just` at the command line to see other convenience shortcuts. ',
}

const questionSix = {
  question: 'What if I don’t like Ubuntu? What are my options?',
  answer: 'The good distros have well maintained cloud images. You can use them _all_. Bluefin/Alpine is the author’s preferred personal setup. Bluefin consumes distro images at her leisure.',
}
</script>

<template>
  <section id="scene-faq" class="section-wrap">
    <div class="container small">
      <div>
        <SceneContent tag="Unsure?" title="FAQ" :text="content" />
      </div>

      <!-- Questions -->
      <div class="faq-list">
        <FaqItem v-bind="questionOne" />
        <FaqItem v-bind="questionTwo" />
        <FaqItem v-bind="questionThree" />
        <FaqItem v-bind="questionFour" />
        <FaqItem v-bind="questionFive" />
        <FaqItem v-bind="questionSix" />
      </div>

      <SceneVisibilityChecker name="#scene-faq" />
    </div>
  </section>
</template>
