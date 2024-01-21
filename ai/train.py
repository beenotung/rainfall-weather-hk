# %% prepare sample data

import os

# os.system("head -n 70000 export.csv > sample.csv") # 3 days
# os.system("head -n 700000 export.csv > sample.csv") # 1 month
os.system("head -n 626414 export.csv > sample.csv") # 1 years
# os.system("head -n 1874711 export.csv > sample.csv") # 3 years
# os.system("head -n 4030456 export.csv > sample.csv") # 10 years

SHUFFLE_BUFFER = 1200000

# %% load DataFrame from csv

import pandas as pd

df = pd.read_csv("sample.csv")


# %% inspect DataFrame

print("df:",df)


print("min month:",min(df['date_month']))
print("max month:",max(df['date_month']))


print("min year:",min(df['date_year']))
print("max year:",max(df['date_year']))

df.dtypes

# %% extract numeric features

feature_names = ['date_month', 'date_day', 'time_hour', 'time_minute']
input_features = df[feature_names]

input_features.head()

# %% load tensorflow library
import tensorflow as tf

tf.__version__

# %% convert input features into tensor

inputs = tf.convert_to_tensor(input_features)
inputs

# %% combine input features and target into dataset

target = df.pop('rainfall_amount')
dataset = tf.data.Dataset.from_tensor_slices((input_features, target))


# %% prepare into tensorflow format

BATCH_SIZE = 20

dataset_batches = dataset.shuffle(SHUFFLE_BUFFER).batch(BATCH_SIZE)
dataset_batches 

# %% normalize the input data

normalizer = tf.keras.layers.Normalization(axis=-1)
normalizer.adapt(inputs)

# %% build a simple model

model = tf.keras.Sequential([
  normalizer,
  tf.keras.layers.Dense(4, activation='relu'),
  tf.keras.layers.Dense(4, activation='relu'),
  tf.keras.layers.Dense(1),
])

model.compile(
  optimizer='sgd',
  loss='mse',
  metrics=['accuracy']
)

# %% train the model

EPOCHS = 5
VALIDATION_SPLIT = 0.33

history = model.fit(
  inputs,
  target,
  validation_split=VALIDATION_SPLIT,
  epochs=EPOCHS,
  batch_size=BATCH_SIZE
)

# %% save the model

model.save('model.tf', save_format='tf')

# %% show the training progress

import matplotlib.pyplot as plt

print(history.history.keys())

# %% summarize history for accuracy

plt.plot(history.history['accuracy'])
plt.plot(history.history['val_accuracy'])
plt.title('model accuracy')
plt.ylabel('accuracy')
plt.xlabel('epoch')
plt.legend(['train', 'test'], loc='upper left')
plt.show()

# %% summarize history for loss

plt.plot(history.history['loss'])
plt.plot(history.history['val_loss'])
plt.title('model loss')
plt.ylabel('loss')
plt.xlabel('epoch')
plt.legend(['train', 'test'], loc='upper left')
plt.show()
