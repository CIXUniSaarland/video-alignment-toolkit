
import pandas as pd

df = pd.read_csv("/home/joao/Code/video-alignment-toolkit/datasets/jester/Train.csv")
chosen_classes = [
    'Swiping Left',
    'Swiping Right',
    'Swiping Down',
    'Swiping Up',
    'Sliding Two Fingers Down',
    'Sliding Two Fingers Up',
    'Thumb Down',
    'Thumb Up',
]

filtered_df = df[df['label'].isin(chosen_classes)]
label_counts = filtered_df['label'].value_counts().min()

print(label_counts)