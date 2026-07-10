---
title: 'DiagramNet: An End-to-End Recognition Framework and Dataset for Non-Standard System-Level Diagrams'
authors:
  - me
  - Ruohan Xu
  - Jiapeng Li
  - Junyin Pi
  - Runzhe Tao
  - Weijian Fan
  - Xiao Tan
  - Guojie Luo
  - Yibo Lin
date: '2026-05-02T09:21:30Z'
publishDate: '2026-05-02T09:21:30Z'
publication_types: ['preprint']
publication:
  name: arXiv preprint
  short_name: arXiv:2605.01338
peer_reviewed: false
open_access: true
abstract: >-
  System-level diagrams encode the architectural blueprint of chip design, specifying module functions, dataflows, and interface protocols. However, non-standardized symbols and the scarcity of structured training data hinder existing multimodal large language models (MLLMs) from recognizing these diagrams. To address this gap, we introduce DiagramNet, the first multimodal dataset for system-level diagrams, comprising 10,977 connection annotations and 15,515 chain-of-thought QA pairs across four tasks: Listing, Localization, Connection, and Circuit QA. Building on this dataset, we propose a progressive training pipeline together with a decoupled multi-agent workflow that decomposes complex visual reasoning into Perception, Reasoning, and Knowledge stages. On the DiagramNet benchmark, integrating our 3B-parameter model with the proposed workflow surpasses the 2025 EDA Elite Challenge winner and outperforms GPT-5, Claude-Sonnet-4, and Gemini-2.5-Pro by over 2x in end-to-end evaluation. Notably, the workflow generalizes beyond our model, boosting Task 1 performance by 128.7x for Gemini-2.5-Pro and 12.4x for GPT-5. Furthermore, with only 60 images for detector adaptation, the method transfers effectively to AMSBench, achieving zero-shot connectivity reasoning on par with GPT-5 and Claude-Sonnet-4 while surpassing the AMS state-of-the-art method Netlistify.
summary: A multimodal dataset, progressive training pipeline, and multi-agent workflow for recognizing non-standard system-level diagrams.
tags:
  - Multimodal Circuit Intelligence
  - System-Level Diagrams
  - Multi-Agent Reasoning
featured: false
links:
  - type: preprint
    provider: arxiv
    id: '2605.01338'
---
