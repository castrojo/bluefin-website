//
// Landing section

import { IconGithubCircle } from '@iconify-prerendered/vue-mdi'

//
export const LangLandingTag = 'Project'
export const LangLandingTitle = 'Bluefin'
export const LangLandingText = '“Evolution is a process of constant branching and expansion”'

//
// Users section
//
export const LangUsersTag = 'For'
export const LangUsersTitle = 'Users'
export const LangUsersText = 'Our system offers the best of both worlds: the reliability and ease of use of a Chromebook, and the performance and versatility of Ubuntu and Fedora combined.'
export const LangUsersListItems = [
  'An ecosphere of applications provided by Flathub',
  'Zero maintenance',
  'Included GPU drivers and Flathub gaming experience',
]

//
// Developers Section
//
export const LangDevsTag = 'For'
export const LangDevsTitle = 'Developers'
export const LangDevsText = 'Three developer workflows to get you started depending on where you\'re coming from: (or bring your own!)'

export const LangDevsBoxOne = 'Built-in Ubuntu user space integrated with Visual Studio Code. Run any OCI container as your developer environment.'
export const LangDevsBoxTwo = 'Devbox and Fleek - harness the power of nix without the complexity'
export const LangDevsBoxThree = 'Next generation developer tools like Devpod'
export const LangDevsBoxFour = 'Built-in Homebrew'

//
// Mission section
//
export const LangMissionTag = 'Our Goal'
export const LangMissionTitle = 'Mission Statement'
export const LangMissionText = `
Bluefin is not just software. She is a new breed of animal, adapted to survive the rigors of an ecosystem dominated by giants while protecting her family.

We believe that the desktop needs to change. That technology starts with your local computer, the device that touches your hands -- and that has to be as important as the rest of it. 

By bringing cloud-native patterns to the desktop we hope to provide an open source alternative to Chromebooks while also catering to the next-generation of open source contributor. 

Bluefin is about sustainability of the software, the hardware, and the people.

> There are two ways of spreading light: to be the candle or the mirror that reflects it. 
> <cite>[Edith Wharton][1]</cite>

[1]: https://en.wikipedia.org/wiki/Edith_Wharton
`

//
// Frequently asked questions
//
export const LangFaqTag = 'Unsure?'
export const LangFaqTitle = 'FAQ'
export const LangFaqText = `
If your questions remain unanswered, 
you can reach us at [jorge@bluefin.com](jorge@bluefin.com).
`
export const LangFaqQuestions = [
  {
    question: 'What is this exactly? Why did you make a Linux distribution?',
    answer: ' Blufin uses Fedora\'s OCI deployment feature to decouple the system image from configuration. This allows for customization similar to a configuration management tool such as Ansible or Salt without the usual problems associated with custom distributions. All of Bluefin and universal blue are open source and signed by cosign. It\'s more akin to having someone install Fedora for you and set it up “the right way”. \n\n What is a cloud native model? \n\n [Check it out on YouTube](https://youtu.be/p-88GN1WVs8)',
    open: true,
  },
  {
    question: 'Where can I find more details on the features?',
    answer: 'You can find detailed information in our Github repository. \n\n [Visit Github](https://github.com/ublue-os/bluefin#readme)',
  },
  {
    question: 'What if I want something like KDE or another window manager?',
    answer: 'Bluefin is an opinionated GNOME experience. However Universal Blue provides a maintained set of base images for anyone to be able to make their own custom image. We hope Bluefin acts as an inspiration for others to build their own communities around user experiences. For example check out Bazzite if you want a great KDE gaming experience, similar to SteamOS',
  },
  {
    question: 'What do the -framework images do?',
    answer: 'These follow Framework\'s recommendations to swap out gnome-power-profile with tlp. The recommended settings are shipped, but allow for user-overridden configuration. We hope the framework community can help us ship a good set of configs that would allow for quick testing of battery settings so we can maintain it long term.',
  },
  {
    question: 'How do I change my shell?',
    answer: '`just zsh` or `just fish` will prompt you to switch your shell. Type `just` at the command line to see other convenience shortcuts. ',
  },
  {
    question: 'What if I don\'t like Ubuntu? What are my options?',
    answer: 'The good distros have well maintained cloud images. You can use them _all_. Bluefin/Alpine is the author\'s preferred personal setup. Bluefin consumes distro images at her leisure.',
  },
]

//
// Footer content
//
export const LangFooterProjectTitle = 'Project Bluefin'
export const LangFooterProject = 'Bluefin is built with Universal Blue, a community toolkit designed to consume OStree operating systems. Built for the love of the game. Welcome to Indie Cloud Native.'
export const LangFooterReferences = 'We frown upon *any usage* of AI in art. Artworks have been drawn by the talented [Jacob Schnurr](https://www.etsy.com/listing/1425657775/cretaceous-chonkers-chonky-dinosaur) and [DragonsofWales](https://www.etsy.com/fi-en/shop/DragonsofWales?ref=profile_header). The website was designed and implemented by [Jan Dolanský](https://dolansky.dev/).'

// The icons are taken from here
// https://icones.js.org/collection/mdi
export const LangSocialLinks = [
  {
    component: IconGithubCircle,
    text: 'Github',
    link: 'https://github.com/ublue-os/bluefin',
  },
]
